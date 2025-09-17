// FILE: app/api/patients/signup/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Json = Record<string, unknown>

function bad(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export async function POST(req: Request) {
  let body: Json
  try {
    body = (await req.json()) as Json
  } catch {
    return bad(400, 'Invalid JSON body')
  }

  const first_name = String(body?.first_name ?? '').trim()
  const last_name = String(body?.last_name ?? '').trim()
  const email = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')

  if (!first_name || !last_name || !email || !password) {
    return bad(400, 'first_name, last_name, email, password are required')
  }
  if (password.length < 8) {
    return bad(400, 'Password must be at least 8 characters')
  }

  // Accept both NEXT_PUBLIC_* and SUPABASE_* env names to be safe.
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''

  if (!url || !anon) {
    return bad(
      500,
      'Supabase env missing',
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY)',
    )
  }

  // Server-side anon client; no server session persistence.
  const supabase = createSbClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Optional: If you have a redirect configured in Supabase Auth, you can omit this.
  const emailRedirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : undefined

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        first_name,
        last_name,
        // optional fields forwarded into user_metadata
        phone_number: body?.phone ?? null,
        date_of_birth: body?.date_of_birth ?? null,
        address: body?.address ?? null,
        emergency_contact_name: body?.emergency_contact_name ?? null,
        emergency_contact_phone: body?.emergency_contact_phone ?? null,
        emergency_contact_relationship: body?.emergency_contact_relationship ?? null,
        treatment_program: body?.treatment_program ?? null,
      },
    },
  })

  if (error) {
    // Map duplicate email to 409; otherwise use provided status or 400.
    const status = /registered|exists/i.test(error.message) ? 409 : error.status ?? 400
    return bad(status, error.message)
  }

  return NextResponse.json(
    {
      ok: true,
      user_id: data.user?.id,
      email: data.user?.email,
      needs_email_confirm: !data.session, // true if email confirmation is enabled
    },
    { status: 201 },
  )
}
