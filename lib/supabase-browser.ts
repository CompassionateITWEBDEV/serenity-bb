"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
type DB = any;

// HMR-safe global cache to prevent "Multiple GoTrueClient instances" warning.
declare global {
  // eslint-disable-next-line no-var
  var __SB_CLIENT__: SupabaseClient<DB> | undefined;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_KEY = "sb-app-auth"; // ← unify across staff/patient

function makeClient(): SupabaseClient<DB> {
  return createClient<DB>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

export const supabase: SupabaseClient<DB> = globalThis.__SB_CLIENT__ ?? makeClient();
if (!globalThis.__SB_CLIENT__) globalThis.__SB_CLIENT__ = supabase;

// Wait briefly for Supabase to hydrate session (avoids bouncing to login).
async function waitForAuthEvent(timeoutMs = 2500): Promise<Session | null> {
  return new Promise<Session | null>((resolve) => {
    let settled = false;

    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      const { data } = await supabase.auth.getSession();
      resolve(data.session ?? null);
    }, timeoutMs);

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        settled = true;
        clearTimeout(timer);
        sub.subscription.unsubscribe();
        resolve(data.session);
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!settled && data.session) {
        settled = true;
        clearTimeout(timer);
        sub.subscription.unsubscribe();
        resolve(data.session);
      }
    })();
  });
}

export async function ensureSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) return data.session;

    const hydrated = await waitForAuthEvent(2500);
    if (hydrated) return hydrated;

    const retry = await supabase.auth.getSession();
    return retry.data.session ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* no-op */
  }
}
