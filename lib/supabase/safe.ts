// ./lib/supabase/safe.ts
// Small helpers to avoid hard-crashing UI when a column is missing.
import { supabase } from "@/lib/supabase/client";

export type SafeResult<T> = { data: T | null; error: string | null };

export async function safeSelect<T = any>(
  from: string,
  // IMPORTANT: never request non-existent columns; use "*" or known-safe fields
  selectStr: string = "*",
  filter?: (q: any) => any
): Promise<SafeResult<T>> {
  try {
    let q = supabase.from(from).select(selectStr);
    if (filter) q = filter(q);
    const { data, error } = (await q) as { data: T | null; error: any };
    if (error) {
      // swallow Postgrest column errors and return null
      const msg = typeof error?.message === "string" ? error.message : "Unknown error";
      // Only log to console; do not surface as a red strip in UI
      console.warn(`[safeSelect:${from}]`, msg);
      return { data: null, error: msg };
    }
    return { data, error: null };
  } catch (e: any) {
    console.warn(`[safeSelect:${from}]`, e?.message || e);
    return { data: null, error: e?.message || "Request failed" };
  }
}
