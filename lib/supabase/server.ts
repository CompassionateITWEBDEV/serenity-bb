// lib/supabase/server.ts
import 'server-only';
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js';

type Db = unknown; // replace with your generated types if available

/**
 * Factory for server-only Supabase client using the Service Role key.
 * Never import this file in Client Components.
 */
export function createServiceRoleClient(): SupabaseClient<Db> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Why: Guard so the module never crashes at build due to missing env.
    throw new Error('Missing SUPABASE env variables');
  }
  return createAdminClient<Db>(url, key);
}
