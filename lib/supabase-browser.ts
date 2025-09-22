"use client"

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Avoid multiple clients during HMR
declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  const msg = "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  if (process.env.NODE_ENV !== "production") {
    throw new Error(`❌ ${msg}. Check your .env.local and Vercel Project Settings.`)
  } else {
    // eslint-disable-next-line no-console
    console.error(`❌ ${msg}.`)
  }
}

function getClient(): SupabaseClient {
  if (!globalThis.__SUPABASE_BROWSER__) {
    globalThis.__SUPABASE_BROWSER__ = createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return globalThis.__SUPABASE_BROWSER__
}

export const supabase = getClient()
