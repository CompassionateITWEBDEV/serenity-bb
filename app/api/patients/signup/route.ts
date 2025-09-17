// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'          // keep this on Node, not edge
export const dynamic = 'force-dynamic'   // ensure no static optimization

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // Throw at request time (clear 500 + log), not at build time
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await req.json()
    // ... validate and create the user ...
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: any) {
    console.error('signup error', err)
    return NextResponse.json({ error: err.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
