import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Json = Record<string, unknown>
const fail = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: message, details }, { status })

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Json

    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    const first_name = String(body?.first_name ?? '').trim()
    const last_name = String(body?.last_name ?? '').trim()
    if (!email || !password || !first_name || !last_name) {
      return fail(400, 'first_name, last_name, email, password are required')
    }
    if (password.length < 8) return fail(400, 'Password must be at least 8 characters')

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) return fail(500, 'Supabase env missing on server. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')

    const supabase = createSbClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })

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
      // Surface exact reason to the client for now (helps you debug 500s)
      console.error('[signup] supabase error:', { status: error.status, message: error.message })
      const status = /registered|exists/i.test(error.message) ? 409 : error.status ?? 400
      return fail(status, error.message)
    }

    return NextResponse.json({
      ok: true,
      user_id: data.user?.id,
      email: data.user?.email,
      needs_email_confirm: !data.session,
    }, { status: 201 })

  } catch (e: any) {
    console.error('[signup] unexpected:', e)
    return fail(500, 'Unexpected error', e?.message ?? e)
  }
}
