"use client";

import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);
// Optional: set to a single shared key (patient + staff) via env for consistency
const STORAGE_KEY = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY; // e.g. "sb-app-auth"

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

function makeClient(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: {
      ...(STORAGE_KEY ? { storageKey: STORAGE_KEY } : {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
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
  // Try current session; if missing, one-time refresh (helps right after reloads)
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token ?? null;
  if (!token) {
    const r = await supabase.auth.refreshSession();
    token = r.data.session?.access_token ?? null;
  }
  return token;
}

/** Reliable session getter: hydration grace + one auth event wait */
export async function ensureSession(opts?: {
  graceMs?: number;    // wait for localStorage hydration
  fallbackMs?: number; // one-shot timeout while waiting for auth event
}): Promise<Session | null> {
  const graceMs = opts?.graceMs ?? 300;
  const fallbackMs = opts?.fallbackMs ?? 500;

  // 1) immediate read
  let { data } = await supabase.auth.getSession();
  let session = data?.session ?? null;
  if (session) return session;

  // 2) grace for hydration
  await new Promise((r) => setTimeout(r, graceMs));
  ({ data } = await supabase.auth.getSession());
  session = data?.session ?? null;
  if (session) return session;

  // 3) wait for first auth event OR fallback timer
  return await new Promise<Session | null>((resolve) => {
    let decided = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (decided) return;
      decided = true;
      sub.subscription.unsubscribe();
      resolve(newSession ?? null);
    });
    setTimeout(async () => {
      if (decided) return;
      decided = true;
      sub.subscription.unsubscribe();
      const again = (await supabase.auth.getSession()).data.session ?? null;
      resolve(again);
    }, fallbackMs);
  });
}

/** Simple realtime subscription helper */
export function subscribeToTable<T = unknown>(opts: {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
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
  return () => {
    try {
      supabase.removeChannel(ch);
    } catch {}
  };
}

export type { SupabaseClient as SupabaseBrowserClient };
