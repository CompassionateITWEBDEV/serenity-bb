'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global { var __srcHealthSupabase: SupabaseClient | undefined; }

function makeClient(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env vars missing');
  return createClient(url, anon, {
    auth: { storageKey: 'src-health-auth', persistSession: true, autoRefreshToken: true },
  });
}

export const supabase: SupabaseClient =
  globalThis.__srcHealthSupabase ?? (globalThis.__srcHealthSupabase = makeClient());
