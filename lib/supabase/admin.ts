import 'server-only';
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js';

type Db = unknown;

/**
 * Creates a server-only Supabase client with the Service Role key.
 * Why: lazy env read prevents build-time crashes and avoids Edge.
 */
export function getSbAdmin(): SupabaseClient<Db> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');
  return createAdminClient<Db>(url, key);
}
