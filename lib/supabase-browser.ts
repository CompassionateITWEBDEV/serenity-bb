import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supaEnvOk: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

function createBrowserClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Soft fallback; lets UI render. Real calls will 401/404 as expected.
    // @ts-expect-error placeholder init for DX
    return createClient("http://localhost", "anon", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      db: { schema: "public" },
    });
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: { schema: "public" },
    global: process.env.NEXT_PUBLIC_SUPABASE_DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

// Singleton across HMR
export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = createBrowserClient());

// Hard guard for code paths that must not run without valid envs.
export function requireSupabaseEnv(): asserts supaEnvOk is true {
  if (!supaEnvOk) {
    throw new Error("Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.");
  }
}

// Convenience auth helpers
export async function getAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn("supabase.auth.getSession:", error.message);
  return data?.session ?? null;
}

export async function getAuthUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.warn("supabase.auth.getUser:", error.message);
  return data?.user ?? null;
}

/**
 * Realtime helper (Postgres Changes).
 */
export function subscribeToTable<T = unknown>(opts: {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
}): () => void {
  if (!supaEnvOk) {
    console.warn("subscribeToTable skipped: Supabase env not set.");
    return () => {};
  }
  const { table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete } = opts;

  const channel = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on(
      "postgres_changes",
      { event, schema, table, filter },
      (payload) => {
        if (payload.eventType === "INSERT") onInsert?.(payload.new as T);
        else if (payload.eventType === "UPDATE") onUpdate?.(payload.new as T);
        else if (payload.eventType === "DELETE") onDelete?.(payload.old as T);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
