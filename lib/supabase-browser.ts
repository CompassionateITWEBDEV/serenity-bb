// FILE: lib/supabase-browser.ts
// Singleton browser client; avoids multiple GoTrue instances.
"use client";
export { supabase as default, supabase } from "@/lib/supabase/client";
export { getSupabaseClient as getClient } from "@/lib/supabase/client";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "sb-patient", // why: namespace to avoid clashes
    },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return _client;
}

/** Preferred: import { supabaseBrowser } from "@/lib/supabase-browser" */
export const supabaseBrowser = getBrowserClient();

// (Optional) default export kept as the *client* to prevent misuse.
// If you previously imported default and *called* it, switch to the named import above.
export default supabaseBrowser;
