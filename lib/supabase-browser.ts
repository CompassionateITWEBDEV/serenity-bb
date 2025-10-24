"use client";

import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from "@supabase/supabase-js";

type DB = any;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_KEY = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || "sb-app-auth";
const DEBUG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_DEBUG);

declare global {
  // eslint-disable-next-line no-var
  var __SB_CLIENT__: SupabaseClient<DB> | undefined;
}

function makeClient(): SupabaseClient<DB> {
  return createClient<DB>(URL, ANON, {
    auth: {
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    db: { schema: "public" },
    global: DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

// HMR-safe singleton
export const supabase: SupabaseClient<DB> =
  globalThis.__SB_CLIENT__ ?? (globalThis.__SB_CLIENT__ = makeClient());
export default supabase;

// ── Auth helpers ─────────────────────────────────────────────────────────────
export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  try {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token ?? null;
    if (token) return token;
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session?.access_token ?? null;
  } catch (e: any) {
    if (typeof e?.message === "string" && /invalid\s+refresh\s+token|not\s+found/i.test(e.message)) {
      try { await supabase.auth.signOut(); } catch {}
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      if (typeof window !== "undefined") {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
      return null;
    }
    throw e;
  }
}

export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* no-op */
  }
}

/** Ensure a session exists (prevents false-unauth during navigation). */
export async function ensureSession(opts?: {
  graceMs?: number;    // wait for storage hydration
  fallbackMs?: number; // timeout while waiting for the first auth event
}): Promise<Session | null> {
  const graceMs = opts?.graceMs ?? 300;
  const fallbackMs = opts?.fallbackMs ?? 500;

  // 1) immediate
  let { data } = await supabase.auth.getSession();
  let session = data.session ?? null;
  if (session) return session;

  // 2) brief grace
  await new Promise((r) => setTimeout(r, graceMs));
  ({ data } = await supabase.auth.getSession());
  session = data.session ?? null;
  if (session) return session;

  // 3) wait for the first auth event OR fallback
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

// ── Realtime helper ──────────────────────────────────────────────────────────
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
