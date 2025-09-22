"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  const msg = "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  if (process.env.NODE_ENV !== "production") {
    throw new Error(`❌ ${msg}. Configure .env.local and Vercel Project Settings.`)
  } else {
    // eslint-disable-next-line no-console
    console.error(`❌ ${msg}. Supabase client will not work at runtime.`)
  }
}

function getClient(): SupabaseClient {
  if (!globalThis.__SUPABASE_BROWSER__) {
    globalThis.__SUPABASE_BROWSER__ = createClient(url ?? "", anon ?? "", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return globalThis.__SUPABASE_BROWSER__
}

export const supabase = getClient()
