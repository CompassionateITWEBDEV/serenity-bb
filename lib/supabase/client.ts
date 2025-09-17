'use client'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

let sb: SupabaseClient<Db> | null = null

/** Lazy, HMR-safe browser client (anon key). */
export function createClient(): SupabaseClient<Db> {
  if (sb) return sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  sb = createSbClient<Db>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true }, // keep user logged in on the browser
  })
  return sb
}
