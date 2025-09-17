'use client'

import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

// HMR-safe global to avoid multiple GoTrue instances in dev
const globalForSb = globalThis as unknown as { __SB__?: SupabaseClient<Db> }

/** Lazy singleton anon client for the browser. */
export function createClient(): SupabaseClient<Db> {
  if (globalForSb.__SB__) return globalForSb.__SB__
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  globalForSb.__SB__ = createSbClient<Db>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true }, // keep user logged in
  })
  return globalForSb.__SB__
}

/** Alias for folks importing getSupabase() */
export const getSupabase = createClient

/**
 * Compat export for legacy imports:
 *   import { supabase } from '@/lib/supabase/client'
 * Note: created on first import; OK for client components.
 */
export const supabase: SupabaseClient<Db> = createClient()

/** Default export for `import sb from '@/lib/supabase/client'` */
export default createClient
