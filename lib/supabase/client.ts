'use client';
import { createClient as _sb, type SupabaseClient } from '@supabase/supabase-js';
declare global { var __srcHealthSupabase: SupabaseClient | undefined; }

function make(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
  return _sb(url, anon, { auth: { storageKey: 'src-health-auth', persistSession: true, autoRefreshToken: true } });
}

// the ONE instance
export const supabase: SupabaseClient =
  globalThis.__srcHealthSupabase ?? (globalThis.__srcHealthSupabase = make());

// compatibility shim so legacy code `createClient()` returns the singleton
export function createClient(): SupabaseClient { return supabase; }
