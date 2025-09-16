import { createClient, type SupabaseClient } from "@supabase/supabase-js"

declare global {
  // eslint-disable-next-line no-var
  var __SB__: SupabaseClient | undefined
}

/** Why: prevent "Multiple GoTrueClient instances" + ensure stable auth storage key. */
export const supabase: SupabaseClient =
  globalThis.__SB__ ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "src-auth",
      },
    }
  )

if (process.env.NODE_ENV !== "production") globalThis.__SB__ = supabase
