import 'server-only';
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js';

type Db = unknown;

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim().length > 0) return v;
  }
  return undefined;
}

/**
 * Creates a Supabase admin client using service-role key.
 * Accepts common env names and reports which are missing.
 */
export function getSbAdmin(): SupabaseClient<Db> {
  const url = pickEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const serviceKey = pickEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE');

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE');

  if (missing.length) {
    // Why: Make misconfiguration obvious without leaking secrets.
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
  return createAdminClient<Db>(url!, serviceKey!);
}

// ============================================================================
// File: app/api/diag/env/route.ts
// Quick runtime checker: confirms Vercel/Node can see required envs.
// ============================================================================
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  const read = (k: string) => {
    const v = process.env[k];
    return typeof v === 'string' && v.trim().length > 0;
  };

  const hasPublicUrl = read('NEXT_PUBLIC_SUPABASE_URL') || read('SUPABASE_URL');
  const hasAnon = read('NEXT_PUBLIC_SUPABASE_ANON_KEY') || read('SUPABASE_ANON_KEY');
  const hasService = read('SUPABASE_SERVICE_ROLE_KEY') || read('SUPABASE_SERVICE_ROLE');

  return NextResponse.json(
    {
      ok: hasPublicUrl && hasAnon && hasService,
      vars: {
        NEXT_PUBLIC_SUPABASE_URL_or_SUPABASE_URL: hasPublicUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY_or_SUPABASE_ANON_KEY: hasAnon,
        SUPABASE_SERVICE_ROLE_KEY_or_SUPABASE_SERVICE_ROLE: hasService,
      },
      runtime: 'nodejs',
      node: process.version,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    },
    { status: hasPublicUrl && hasAnon && hasService ? 200 : 500 },
  );
}
