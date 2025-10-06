// File: /lib/supabase/client.ts
"use client";

/**
 * Shim + compatibility layer. Do NOT create a new Supabase client here.
 * Everything re-exports the canonical singleton from /lib/supabase-browser.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// Pull the canonical singleton
import { supabase as browserSingleton } from "@/lib/supabase-browser";

// Re-export the full API from the canonical client for convenience
export * from "@/lib/supabase-browser";

// Keep the same named and default exports people already use
export const supabase = browserSingleton;
export default browserSingleton;

/** Legacy helper: return the singleton client (keeps old imports working). */
export function getSupabaseClient<T = unknown>(): SupabaseClient<T> {
  return browserSingleton as unknown as SupabaseClient<T>;
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
  return browserSingleton as unknown as SupabaseClient<T>;
}
