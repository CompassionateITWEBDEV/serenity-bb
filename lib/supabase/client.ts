'use client'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

let sb: SupabaseClient<Db> | null = null

/** Return a singleton browser client (created on first use). */
export function createClient(): SupabaseClient<Db> {
  if (sb) return sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    // why: fail loudly so build doesn’t succeed with broken config
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  sb = createSbClient<Db>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true }, // why: keep session seamlessly
  })
  return sb
}

// Optional named alias if some files import a different name.
export const getSupabase = createClient
