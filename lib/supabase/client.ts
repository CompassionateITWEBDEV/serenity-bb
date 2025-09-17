'use client'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

// HMR-safe singleton to avoid "Multiple GoTrueClient instances"
const g = globalThis as unknown as { __SB__?: SupabaseClient<Db> }

export function createClient(): SupabaseClient<Db> {
  if (g.__SB__) return g.__SB__
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  g.__SB__ = createSbClient<Db>(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // single storageKey so only one client touches it
      storageKey: 'sb-auth-token',
    },
  })
  return g.__SB__
}

// Compat export for legacy imports: `import { supabase } from '@/lib/supabase/client'`
export const supabase: SupabaseClient<Db> = createClient()

export default createClient
