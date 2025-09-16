// lib/supabase/client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Factory for browser-safe Supabase client.
 * Throws early if public env is missing to avoid silent failures.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Why: Prevents hydration/build surprises when env is misconfigured.
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient(url, anon);
}
