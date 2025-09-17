// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(), // "YYYY-MM-DD"
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  treatment_type: z.string().optional().nullable(),
})

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(req: Request) {
  try {
    const input = Body.parse(await req.json())
    const supabase = getSupabaseAdmin()

    // 1) Create auth user
    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
        date_of_birth: input.date_of_birth,
        role: 'patient',
      },
    })
    if (authErr) {
      const msg = authErr.message || 'Auth error'
      const status = /already|exists|taken/i.test(msg) ? 409 : 400
      return NextResponse.json({ error: msg }, { status })
    }
    const userId = created.user?.id

    // 2) Optional: create a row in your “patients” table if you have one
    //    Adjust column names to your schema or comment this out if not needed.
    try {
      await supabase.from('patients').insert({
        id: userId,                           // if patients.id is UUID (auth.user.id)
        email: input.email,
        full_name: `${input.first_name} ${input.last_name}`,
        phone_number: input.phone,
        date_of_birth: input.date_of_birth,
        emergency_contact_name: input.emergency_contact_name,
        emergency_contact_phone: input.emergency_contact_phone,
        emergency_contact_relationship: input.emergency_contact_relationship,
        treatment_type: input.treatment_type,
      })
    } catch (e) {
      console.warn('Patients insert skipped/failed:', (e as Error).message)
    }

    return NextResponse.json({ ok: true, userId }, { status: 201 })
  } catch (err: any) {
    // zod validation -> 400 with field errors
    if (err?.issues) {
      const fields: Record<string, string[]> = {}
      for (const issue of err.issues) {
        const k = issue.path.join('.') || 'form'
        fields[k] = [...(fields[k] || []), issue.message]
      }
      return NextResponse.json({ title: 'Invalid input', fields }, { status: 400 })
    }
    console.error('signup error', err)
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
