// lib/supabase/client.ts
'use client';
import { createClient as _sb, type SupabaseClient } from '@supabase/supabase-js';

declare global { var __srcHealthSupabase: SupabaseClient | undefined; }

function make(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return _sb(url, anon, {
    auth: {
      storageKey: 'src-health-auth',   // keep this unique for your app
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase: SupabaseClient =
  globalThis.__srcHealthSupabase ?? (globalThis.__srcHealthSupabase = make());

// ✅ compatibility shim for legacy imports
export function createClient(): SupabaseClient { return supabase; }
