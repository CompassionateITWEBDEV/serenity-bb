import { createClient, type SupabaseClient } from "@supabase/supabase-js"

declare global {
  // eslint-disable-next-line no-var
  var __sb__: SupabaseClient | undefined
}

export const supabase: SupabaseClient =
  globalThis.__sb__ ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "src-app-auth", // why: isolate storage to avoid collisions
      },
    }
  )

if (process.env.NODE_ENV !== "production") globalThis.__sb__ = supabase
