'use client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

type Db = unknown

let sb: SupabaseClient<Db> | null = null

/** Lazy singleton; created only in the browser when first needed. */
export function getSupabase(): SupabaseClient<Db> {
  if (sb) return sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  sb = createClient<Db>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true }, // why: keep session automatically
  })
  return sb
}
