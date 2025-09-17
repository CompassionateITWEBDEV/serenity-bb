'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Type the global so TS is happy
declare global {
  // eslint-disable-next-line no-var
  var __srcHealthSupabase: SupabaseClient | undefined;
}

function makeClient(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) {
    // Don't silently create a broken client
    console.warn('Supabase envs missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    throw new Error('Supabase env vars missing');
  }
  return createClient(url, anon, {
    auth: {
      // IMPORTANT: use the same storageKey everywhere in the browser
      storageKey: 'src-health-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Singleton even across HMR
export const supabase: SupabaseClient =
  globalThis.__srcHealthSupabase ?? (globalThis.__srcHealthSupabase = makeClient());

// Optional helper if you prefer a function
export const getSupabaseBrowserClient = () => supabase;
