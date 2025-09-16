import { NextResponse } from "next/server"
import { z } from "zod"
import { sbAdmin } from "@/lib/supabase/admin"

const SignupSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(), // "YYYY-MM-DD" or "MM/DD/YYYY"
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  treatment_type: z.string().optional().nullable(), // "Comprehensive Recovery Program" → store as text
})

function toISODate(input?: string | null) {
  if (!input) return null
  // accepts "YYYY-MM-DD" or "MM/DD/YYYY"
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [_, mm, dd, yyyy] = m
    const iso = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
    if (!isNaN(iso.getTime())) return iso.toISOString().slice(0, 10)
  }
  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = SignupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup data", issues: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data

    const dob = toISODate(data.date_of_birth)
    // why: prevent future DOBs which commonly cause DB check failures
    if (dob) {
      const d = new Date(dob)
      const today = new Date()
      if (d > new Date(today.toISOString().slice(0, 10))) {
        return NextResponse.json({ error: "Date of birth cannot be in the future" }, { status: 400 })
      }
    }

    // 1) Create auth user
    const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // set as needed
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? "Failed to create auth user" }, { status: 400 })
    }
    const uid = created.user.id

    // 2) Insert profile
    const payload = {
      id: uid,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      date_of_birth: dob,
      address: data.address ?? null,
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_phone: data.emergency_contact_phone ?? null,
      emergency_contact_relationship: data.emergency_contact_relationship ?? null,
      treatment_type: data.treatment_type ?? null,
      status: "Active",
      sessions_target: 40,
    }

    const { data: prof, error: profErr } = await sbAdmin.from("profiles").insert(payload).select("*").single()
    if (profErr) {
      // cleanup auth user if profile insert fails
      await sbAdmin.auth.admin.deleteUser(uid)
      return NextResponse.json({ error: `Database error creating new user: ${profErr.message}` }, { status: 400 })
    }

    return NextResponse.json({ user_id: uid, profile: prof }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
