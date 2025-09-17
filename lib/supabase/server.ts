import 'server-only'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
type Db = unknown

let _admin: SupabaseClient<Db> | null = null

/** Service-role client (bypasses RLS). Never import in Client Components. */
export function createServiceRoleClient(): SupabaseClient<Db> {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env variables')
  _admin = createSbClient<Db>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }, // no server sessions
  })
  return _admin
}

// Compat aliases so existing code keeps building:
export const getSbAdmin = createServiceRoleClient           // import { getSbAdmin } from ...
export const createClient = createServiceRoleClient         // import { createClient } from ...
export default createServiceRoleClient   
