"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
// If you have generated DB types, replace `any` with them.
type DB = any;

let supabaseInstance: SupabaseClient<DB> | null = null;

function buildClient(): SupabaseClient<DB> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient<DB>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "src-health-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: { params: { eventsPerSecond: 5 } },
    global: { headers: { "X-Client-Info": "src-health-app" } },
  });
}

export function getSupabaseClient(): SupabaseClient<DB> {
  if (supabaseInstance) return supabaseInstance;
  supabaseInstance = buildClient();
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
export default supabase;

// Legacy alias so code with `import { createClient }` continues to work.
export const createClient = getSupabaseClient;

export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
