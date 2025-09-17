// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'         // why: safest for supabase-js v2
export const dynamic = 'force-dynamic'  // why: avoid prerender

type Json = Record<string, unknown>
const bad = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: message, details }, { status })

export async function POST(req: Request) {
  // 1) parse+validate
  let body: Json
  try {
    body = (await req.json()) as Json
  } catch {
    return bad(400, 'Invalid JSON body')
  }

  const first_name = String(body?.first_name ?? '').trim()
  const last_name  = String(body?.last_name ?? '').trim()
  const email      = String(body?.email ?? '').trim()
  const password   = String(body?.password ?? '')

  if (!first_name || !last_name || !email || !password) {
    return bad(400, 'first_name, last_name, email, password are required')
  }
  if (password.length < 8) return bad(400, 'Password must be at least 8 characters')

  // 2) supabase anon client (server-side)
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL || '' // compat names
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY || ''

  if (!url || !anon) {
    // why: this is the #1 cause of 500 in prod
    return bad(500, 'Supabase env missing', {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    })
  }

  const supabase = createSbClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }, // why: no server session
  })

  const emailRedirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : undefined

  // 3) sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        first_name,
        last_name,
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

  // 4) handle errors/success
  if (error) {
    const status = /registered|exists/i.test(error.message) ? 409 : error.status ?? 400
    return bad(status, error.message)
  }

  return NextResponse.json(
    {
      ok: true,
      user_id: data.user?.id ?? null,
      email: data.user?.email ?? email,
      needs_email_confirm: !data.session, // true if email confirmation is enabled
    },
    { status: 201 },
  )
}
