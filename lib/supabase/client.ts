// lib/supabase/client.ts
"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

/** Internal factory – builds the client once. */
function buildClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "src-health-auth", // isolate from other apps on same domain
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { "X-Client-Info": "src-health-app" },
    },
  });
}

/** Preferred API: returns a shared singleton client (no multiple instances). */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;
  supabaseInstance = buildClient();
  return supabaseInstance;
}

/** Convenience default instance. Import only if module evaluation timing is safe for you. */
export const supabase = getSupabaseClient();

/** Helper: safely read the current access token for Bearer auth to your /api routes. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Backward-compat export if some files import { createClient } */
export { getSupabaseClient as createClient };
