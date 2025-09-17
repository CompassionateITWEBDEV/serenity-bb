'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function make() {
  return createClient(url, anon, {
    auth: {
      storageKey: 'src-health-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// ensure single instance even with HMR
export const supabase =
  (globalThis as any).__srcHealthSupabase || ((globalThis as any).__srcHealthSupabase = make());
