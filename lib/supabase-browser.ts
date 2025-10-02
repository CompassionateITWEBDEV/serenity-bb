import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supaEnvOk: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// HMR-safe global cache
declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

/** Factory for client components. */
export function createSupabaseBrowser(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // dev placeholder to keep UI mountable
    // @ts-expect-error dev placeholder
    return createClient("http://localhost", "anon", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
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
    global: process.env.NEXT_PUBLIC_SUPABASE_DEBUG
      ? { headers: { "x-supabase-debug": "1" } }
      : undefined,
  });
}

// Singleton across HMR
export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ??
  (globalThis.__SUPABASE_BROWSER__ = createSupabaseBrowser());

// Hard guard for code paths that require envs.
export function requireSupabaseEnv(): asserts supaEnvOk is true {
  if (!supaEnvOk) {
    throw new Error(
      "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

/** Session helpers */
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

/** REQUIRED by lib/drug-tests.ts */
export async function getAccessToken(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.access_token ?? null;
}

/** Roles */
export type AppRole = "patient" | "staff" | "admin";

/** Fetch role from public.profiles(role). */
export async function getUserRole(
  client: SupabaseClient = supabase
): Promise<AppRole | null> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    console.warn("profiles.role fetch failed:", error.message);
    return null;
  }
  return (data?.role as AppRole | undefined) ?? null;
}

/** Realtime helper (Postgres Changes) */
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
  const {
    table,
    schema = "public",
    event = "*",
    filter,
    onInsert,
    onUpdate,
    onDelete,
  } = opts;

  const channel = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on(
      "postgres_changes",
      { event, schema, table, filter },
      (payload: any) => {
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
