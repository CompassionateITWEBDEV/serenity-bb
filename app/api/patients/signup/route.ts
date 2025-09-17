import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    const first_name = String(body?.first_name ?? '').trim()
    const last_name = String(body?.last_name ?? '').trim()

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'first_name, last_name, email, password are required' },
        { status: 400 },
      )
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return NextResponse.json({ error: 'Supabase env is missing' }, { status: 500 })
    }

    // anon client on the server; fine because anon is public anyway
    const supabase = createSbClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false }, // no server session
    })

    const emailRedirectTo =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : undefined

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          // store extra fields in user_metadata
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

    if (error) {
      const status = /registered|exists/i.test(error.message) ? 409 : error.status ?? 400
      return NextResponse.json({ error: error.message }, { status })
    }

    // If email confirmation is ON, session will be null
    return NextResponse.json(
      {
        ok: true,
        user_id: data.user?.id,
        email: data.user?.email,
        needs_email_confirm: !data.session,
      },
      { status: 201 },
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
