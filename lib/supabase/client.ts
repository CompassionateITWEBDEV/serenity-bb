// lib/supabase/client.ts
"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
// If you have generated types: `npx supabase gen types ...`
import type { Database } from "@/types/supabase"; // fallback to `any` if you don't have this

type DB = Database extends object ? Database : any;

// Keep a single instance per module evaluation (Fast Refresh safe enough for browser)
let supabaseInstance: SupabaseClient<DB> | null = null;

/** Build a browser Supabase client. */
function buildClient(): SupabaseClient<DB> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // why: fail fast with a clear message
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createSupabaseClient<DB>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "src-health-auth", // isolate within domain
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      // why: avoid event storms if you fan out subscriptions
      params: { eventsPerSecond: 5 },
    },
    global: {
      headers: { "X-Client-Info": "src-health-app" },
    },
  });
}

/** Returns a shared singleton client (prevents multiple GoTrue/websocket instances). */
export function getSupabaseClient(): SupabaseClient<DB> {
  if (supabaseInstance) return supabaseInstance;
  supabaseInstance = buildClient();
  return supabaseInstance;
}

/** Convenience instance when module-eval timing is safe in client components. */
export const supabase = getSupabaseClient();

/** Helper: read current access token for Bearer auth to /api routes. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Optional: health check to assert env + client are OK. */
export function assertSupabaseReady(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase env not configured");
  }
  // Touch the instance to ensure it builds without throwing.
  void getSupabaseClient();
}

/** Also export default for files that import default. */
export default supabase;

// NOTE: Removed the misleading
//   export { getSupabaseClient as createClient };
// because callers might pass (url, key, opts) and break at runtime.
