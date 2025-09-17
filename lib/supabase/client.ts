'use client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
}


const g = globalThis as unknown as { __sb?: SupabaseClient<Db> }
export const supabase: SupabaseClient<Db> =
  g.__sb ??= createClient<Db>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true }, // why: keep user logged in automatically
  })
