import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

export function getSbAdmin(): SupabaseClient {
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Admin env not set');

  admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false }, // why: no browser session on server
  });
  return admin;
}
