// FILE: lib/supabase/client.ts
"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
type DB = any;

let supabaseInstance: SupabaseClient<DB> | null = null;

function buildClient(): SupabaseClient<DB> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient<DB>(url, anon, {
    auth: {
      // IMPORTANT: keep this key identical app-wide
      storageKey: "sb-patient",
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
export const createClient = getSupabaseClient;

export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
