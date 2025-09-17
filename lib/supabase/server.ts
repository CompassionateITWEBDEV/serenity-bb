import 'server-only'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

let _admin: SupabaseClient<Db> | null = null

export function createServiceRoleClient(): SupabaseClient<Db> {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env variables')
  _admin = createSbClient<Db>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _admin
}

// Compat aliases so old imports build:
export const getSbAdmin = createServiceRoleClient
export const createClient = createServiceRoleClient
export default createServiceRoleClient
