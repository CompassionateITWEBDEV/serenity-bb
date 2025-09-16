import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Supabase URL is missing");
  }
  if (!key) {
    throw new Error("Supabase key is missing");
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}
