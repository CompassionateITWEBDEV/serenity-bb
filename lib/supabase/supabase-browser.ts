// File: /lib/supabase/supabase-browser.ts
"use client";

/**
 * Re-export from the canonical singleton to avoid multiple GoTrueClient instances.
 * This file should NOT create its own client instance.
 */
export * from "@/lib/supabase-browser";
export { supabase as default } from "@/lib/supabase-browser";
