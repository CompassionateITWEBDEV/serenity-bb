// /lib/supabase-browser.ts
import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);
export const supaEnvOk = Boolean(URL && ANON);

declare global {
  // HMR-safe singleton
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

/** Build a browser Supabase client. */
function makeClient(): SupabaseClient {
  if (!URL || !ANON) {
    // Soft placeholder to avoid app crash; real network calls will fail as expected.
    // @ts-expect-error: placeholder project for DX when envs are missing
    return createClient("http://localhost", "anon", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      db: { schema: "public" },
    });
  }
  return createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    db: { schema: "public" },
    global: DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

/** The ONLY browser client. Do not create another anywhere else. */
export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = makeClient());

/** Hard guard for code paths that must have envs. */
export function requireSupabaseEnv(): asserts supaEnvOk is true {
  if (!supaEnvOk) throw new Error("Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

/** Session helper. */
export async function getAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn("[supabase] getSession:", error.message);
  return data?.session ?? null;
}

/** User helper. */
export async function getAuthUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.warn("[supabase] getUser:", error.message);
  return data?.user ?? null;
}

/**
 * Robust access token getter:
 * 1) read current session
 * 2) if missing, try a one-time refresh (helps after page reloads/idle)
 */
export async function getAccessToken(): Promise<string | null> {
  let { data, error } = await supabase.auth.getSession();
  if (error) console.warn("[supabase] getSession:", error.message);

  let token = data?.session?.access_token ?? null;
  if (!token) {
    const { data: refreshed, error: rErr } = await supabase.auth.refreshSession();
    if (rErr) {
      console.warn("[supabase] refreshSession:", rErr.message);
      return null;
    }
    token = refreshed.session?.access_token ?? null;
  }
  return token;
}

/** Realtime helper (Postgres Changes). */
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
    console.warn("[supabase] subscribeToTable skipped: env not set.");
    return () => {};
  }
  const { table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete } = opts;

  const channel = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on(
      "postgres_changes",
      { event, schema, table, filter },
      (payload) => {
        // Only call the relevant handler to avoid double-refresh patterns.
        if (payload.eventType === "INSERT") onInsert?.(payload.new as T);
        else if (payload.eventType === "UPDATE") onUpdate?.(payload.new as T);
        else if (payload.eventType === "DELETE") onDelete?.(payload.old as T);
      }
    )
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch { /* no-op */ }
  };
}
