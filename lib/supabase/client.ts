'use client';

import { createClient as createBrowserClient, SupabaseClient } from '@supabase/supabase-js';

type Db = unknown;

/**
 * Browser-safe client using the public anon key.
 * Why: fixes "Attempted import error: 'createClient' is not exported".
 */
export function createClient(): SupabaseClient<Db> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
  return createBrowserClient<Db>(url, anon);
}
