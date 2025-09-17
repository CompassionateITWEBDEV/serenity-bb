'use client';

import { createClient as _makeSbClient, type SupabaseClient } from '@supabase/supabase-js';

// Keep a single instance across HMR/page reloads
declare global {
  // eslint-disable-next-line no-var
  var __srcHealthSupabase: SupabaseClient | undefined;
}

function make(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) {
    throw new Error('Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return _makeSbClient(url, anon, {
    auth: {
      storageKey: 'src-health-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// The ONE browser singleton
export const supabase: SupabaseClient =
  globalThis.__srcHealthSupabase ?? (globalThis.__srcHealthSupabase = make());

/** ✅ Compatibility shim for old imports:
 *    import { createClient } from '@/lib/supabase/client'
 *    const sb = createClient();   // returns the singleton
 */
export function createClient(): SupabaseClient {
  return supabase;
}

// Optional helper
export const getSupabaseBrowserClient = () => supabase;
