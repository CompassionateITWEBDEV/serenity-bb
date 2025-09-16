'use client';
import { createClient as createBrowserClient, SupabaseClient } from '@supabase/supabase-js';
type Db = unknown;

let _sb: SupabaseClient<Db> | null = null;
export function createClient(): SupabaseClient<Db> {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  _sb = createBrowserClient<Db>(url, anon);
  return _sb;
}
export const supabase = createClient();
