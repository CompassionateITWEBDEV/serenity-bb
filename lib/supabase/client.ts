// /lib/supabase/client.ts  ✅ unify storage key for the whole app
"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
type DB = any;

let supabaseInstance: SupabaseClient<DB> | null = null;

function buildClient(): SupabaseClient<DB> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // IMPORTANT: one storageKey for both patient and staff areas
  // Make sure your staff login page imports THIS SAME client file.
  return createSupabaseClient<DB>(url, anon, {
    auth: {
      storageKey: "sb-app-auth",       // ← change from "sb-patient" to shared key
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

export function getSupabaseClient(): SupabaseClient<DB> {
  if (!supabaseInstance) supabaseInstance = buildClient();
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
export default supabase;

export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export { createClient } from "@supabase/supabase-js";
