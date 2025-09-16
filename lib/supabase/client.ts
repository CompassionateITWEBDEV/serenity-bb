'use client';
import { createClient as createBrowserClient, SupabaseClient } from '@supabase/supabase-js';

type Db = unknown;
let _client: SupabaseClient<Db> | null = null;

export function createClient(): SupabaseClient<Db> {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Why: explicit failure if env misconfigured in browser.
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _client = createBrowserClient<Db>(url, anon);
  return _client;
}
