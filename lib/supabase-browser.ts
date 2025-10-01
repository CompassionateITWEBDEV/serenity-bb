import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);
export const supaEnvOk = Boolean(URL && ANON);

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

function makeClient(): SupabaseClient {
  if (!URL || !ANON) {
    // Soft placeholder: keeps UI rendering; calls will 401 downstream.
    // @ts-expect-error dev placeholder
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

export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = makeClient());

export function requireSupabaseEnv(): asserts supaEnvOk is true {
  if (!supaEnvOk) throw new Error("Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY.");
}

export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}
export async function getAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}
export async function getAccessToken(): Promise<string | null> {
  const s = await getAuthSession();
  return s?.access_token ?? null;
}

export function subscribeToTable<T = unknown>(opts: {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
}): () => void {
  if (!supaEnvOk) return () => {};
  const { table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete } = opts;
  const ch = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on(
      "postgres_changes",
      { schema, table, event, filter },
      (payload) => {
        const t = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        if (t === "INSERT") onInsert?.(payload.new as T);
        else if (t === "UPDATE") onUpdate?.(payload.new as T);
        else if (t === "DELETE") onDelete?.(payload.old as T);
      }
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(ch); } catch { /* no-op */ }
  };
}
