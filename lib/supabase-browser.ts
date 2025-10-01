// File: /lib/supabase-browser.ts
import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

/* --- env + debug --------------------------------------------------------- */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);
export const supaEnvOk: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/* --- HMR-safe singleton --------------------------------------------------- */
declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

function createBrowserClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // WHY: Allow UI to render in misconfigured envs; calls will fail fast later.
    // @ts-expect-error local placeholder for DX
    return createClient("http://localhost", "anon", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      db: { schema: "public" },
    });
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    db: { schema: "public" },
    global: DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

// Exported singleton for all browser code paths.
export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = createBrowserClient());

/* --- guards --------------------------------------------------------------- */
export function requireSupabaseEnv(): asserts supaEnvOk is true {
  if (!supaEnvOk) {
    throw new Error("Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

/* --- auth helpers --------------------------------------------------------- */
export async function getAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error && DEBUG) console.warn("supabase.auth.getSession:", error.message);
  return data?.session ?? null;
}

export async function getAuthUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error && DEBUG) console.warn("supabase.auth.getUser:", error.message);
  return data?.user ?? null;
}

/** Returns current access token (null if signed out). */
export async function getAccessToken(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.access_token ?? null;
}

/* --- realtime helper ------------------------------------------------------ */
type SubOpts<T> = {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string; // e.g., "patient_id=eq.<uuid>"
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
};

/**
 * Subscribe to Postgres Changes; returns an unsubscribe function.
 * WHY: Normalize payload shape and hide channel wiring.
 */
export function subscribeToTable<T = unknown>(opts: SubOpts<T>): () => void {
  if (!supaEnvOk) {
    if (DEBUG) console.warn("subscribeToTable skipped: Supabase env not set.");
    return () => {};
  }

  const { table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete } = opts;
  const channel = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on(
      "postgres_changes",
      { event, schema, table, filter },
      (payload: any) => {
        // Normalize per event type
        if (payload.eventType === "INSERT") onInsert?.(payload.new as T);
        else if (payload.eventType === "UPDATE") onUpdate?.(payload.new as T);
        else if (payload.eventType === "DELETE") onDelete?.(payload.old as T);
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* no-op */
    }
  };
}
