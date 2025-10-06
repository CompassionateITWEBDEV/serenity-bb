// File: lib/supabase-browser.ts
// Why: Single Supabase client + reliable session bootstrap to stop the loading/login loop.

"use client";

import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

type DB = any;

// ---- HMR-safe singleton ----
declare global {
  // eslint-disable-next-line no-var
  var __SB_CLIENT__: SupabaseClient<DB> | undefined;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// IMPORTANT: one storageKey for *all* web surfaces (staff + patient).
const STORAGE_KEY = "sb-app-auth";

function makeClient(): SupabaseClient<DB> {
  return createClient<DB>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: STORAGE_KEY, // ← unify key; prevents separate cookies/tokens
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // keep PKCE callback working
      flowType: "pkce",
    },
  });
}

export const supabase: SupabaseClient<DB> = globalThis.__SB_CLIENT__ ?? makeClient();
if (!globalThis.__SB_CLIENT__) globalThis.__SB_CLIENT__ = supabase;

// ---- Robust session bootstrap ----
// Why: Immediately after first mount, getSession() can be null while Supabase hydrates.
// We wait briefly for auth state events so we don't bounce to /staff/login unnecessarily.
async function waitForAuthEvent(timeoutMs = 2500): Promise<Session | null> {
  return new Promise<Session | null>((resolve) => {
    let settled = false;

    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      const { data } = await supabase.auth.getSession();
      resolve(data.session ?? null);
    }, timeoutMs);

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, _sess) => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        settled = true;
        clearTimeout(timer);
        resolve(data.session);
      }
    });

    // Safety: also check once immediately after subscribing.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (settled) return;
      if (data.session) {
        settled = true;
        clearTimeout((timer as unknown) as number);
        sub.subscription.unsubscribe();
        resolve(data.session);
      }
    })().finally(() => {
      // Clean up subscription when the outer promise resolves.
      void Promise.resolve().then(() => {
        if (!settled) return;
        sub.subscription.unsubscribe();
      });
    });
  });
}

/**
 * ensureSession
 * Returns a valid session if found/hydrated; otherwise null.
 * Never throws; the caller (your page) decides to redirect.
 */
export async function ensureSession(): Promise<Session | null> {
  try {
    // 1) quick path
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) return data.session;

    // 2) wait briefly for hydration/auth events (HMR, cold start, PKCE redirect)
    const hydrated = await waitForAuthEvent(2500);
    if (hydrated) return hydrated;

    // 3) final check before giving up
    const again = await supabase.auth.getSession();
    return again.data.session ?? null;
  } catch {
    return null;
  }
}

/** Optional helper used by your header button */
export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

export type { Session } from "@supabase/supabase-js";
