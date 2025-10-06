// File: /lib/supabase/client.ts
"use client";

// Shim + compatibility layer. Do NOT create a new Supabase client here.
// All exports point to the canonical singleton in /lib/supabase-browser.ts.

import type { SupabaseClient } from "@supabase/supabase-js";

// Pull the canonical singleton + default from the browser client.
import supabaseDefault, { supabase as supabaseSingleton } from "@/lib/supabase-browser";

// Re-export the full API from the canonical client for convenience.
export * from "@/lib/supabase-browser";

// Keep the same named and default exports people already use.
export const supabase = supabaseSingleton;
export default supabaseDefault;

/** Legacy helper: return the singleton client (keeps old imports working). */
export function getSupabaseClient<T = unknown>(): SupabaseClient<T> {
  return supabaseSingleton as unknown as SupabaseClient<T>;
}

/**
 * Legacy factory name: proxy that returns the singleton.
 * Intentionally ignores args to avoid spawning extra GoTrue clients.
 */
export function createClient<T = unknown>(
  _url?: string,
  _anonKey?: string,
  _options?: unknown
): SupabaseClient<T> {
  return supabaseSingleton as unknown as SupabaseClient<T>;
  export {
  supabase,
  default,
  ensureSession,
  getAuthSession,
  getAuthUser,
  getAccessToken,
  logout,
} from "@/lib/supabase-browser";
}
