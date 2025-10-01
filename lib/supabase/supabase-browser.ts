import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

function makeClient(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    db: { schema: "public" },
    global: DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = makeClient());

export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}
export async function getAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}
export async function getAccessToken(): Promise<string | null> {
  // try current session, then one-time refresh (helps after reloads)
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token ?? null;
  if (!token) {
    const r = await supabase.auth.refreshSession();
    token = r.data.session?.access_token ?? null;
  }
  return token;
}

export function subscribeToTable<T = unknown>(opts: {
  table: string; schema?: string; event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string; onInsert?: (row: T) => void; onUpdate?: (row: T) => void; onDelete?: (row: T) => void;
}): () => void {
  const { table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete } = opts;
  const ch = supabase
    .channel(`realtime:${schema}.${table}${filter ? `?${filter}` : ""}`)
    .on("postgres_changes", { schema, table, event, filter }, (p: any) => {
      if (p.eventType === "INSERT") onInsert?.(p.new as T);
      else if (p.eventType === "UPDATE") onUpdate?.(p.new as T);
      else if (p.eventType === "DELETE") onDelete?.(p.old as T);
    })
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch {} };
}
