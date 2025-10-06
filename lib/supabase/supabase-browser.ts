// File: /lib/supabase-browser.ts
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

/** One storage key shared by patient + staff UIs */
const STORAGE_KEY = "sb-app-auth";

/** HMR-safe global to prevent multiple GoTrue instances */
declare global {
  // eslint-disable-next-line no-var
  var __SB__: SupabaseClient<DB> | undefined;
}

function make(): SupabaseClient<DB> {
  return createClient<DB>(URL, ANON, {
    auth: {
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    db: { schema: "public" },
  });
}

export const supabase: SupabaseClient<DB> = globalThis.__SB__ ?? (globalThis.__SB__ = make());

/** Basic helpers */
export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}
export async function getAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Reliable session getter (handles hydration) */
export async function ensureSession(opts?: { graceMs?: number; fallbackMs?: number }): Promise<Session | null> {
  const graceMs = opts?.graceMs ?? 250;
  const fallbackMs = opts?.fallbackMs ?? 1500;

  // 1) try now
  {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
  }
  // 2) small grace (localStorage hydration)
  await new Promise((r) => setTimeout(r, graceMs));
  {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
  }
  // 3) wait for a single auth event or timeout
  return await new Promise<Session | null>((resolve) => {
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (done) return;
      done = true;
      sub.subscription.unsubscribe();
      resolve(s ?? null);
    });
    setTimeout(async () => {
      if (done) return;
      done = true;
      sub.subscription.unsubscribe();
      const { data } = await supabase.auth.getSession();
      resolve(data.session ?? null);
    }, fallbackMs);
  });
}

export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {}
}

export default supabase;
