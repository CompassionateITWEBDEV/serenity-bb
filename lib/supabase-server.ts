// lib/supabase-server.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client factory.
 * Uses SERVICE_ROLE if available (never expose to client),
 * falls back to ANON for read-only routes.
 */
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Supabase URL missing");
  if (!key) throw new Error("Supabase key missing");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
