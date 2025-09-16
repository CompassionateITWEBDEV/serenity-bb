import { NextResponse } from "next/server"
import { z } from "zod"
import { getSbAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

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
  treatment_type: z.string().optional().nullable(),
})

function toISODate(input?: string | null) {
  if (!input) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, mm, dd, yyyy] = m
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  return null
}

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>, meta?: Record<string, unknown>) {
  return NextResponse.json(
    { type: "about:blank", title, status, detail, fields, meta },
    { status, headers: { "Content-Type": "application/problem+json" } }
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = SignupSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      return problem(422, "Invalid signup data", "Fix highlighted fields", flat.fieldErrors)
    }
    const data = parsed.data

    const dob = toISODate(data.date_of_birth)
    if (dob) {
      const d = new Date(dob)
      const today = new Date(new Date().toISOString().slice(0, 10))
      if (d > today) return problem(422, "Invalid date of birth", "Date of birth cannot be in the future", { date_of_birth: ["Future date"] })
    }

    let sb
    try {
      sb = getSbAdmin() // requires SUPABASE_SERVICE_ROLE_KEY
    } catch (e: any) {
      return problem(500, "Supabase misconfiguration", e?.message || "Missing SUPABASE env vars")
    }

    // 1) Create auth user
    const { data: created, error: authErr } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    })
    if (authErr || !created?.user) {
      const msg = authErr?.message ?? "Failed to create auth user"
      const status = /exist|taken|already/i.test(msg) ? 409 : 400
      return problem(status, "Auth error", msg, { email: [msg] })
    }
    const uid = created.user.id

    // 2) Insert profile (SAFE: only common columns)
    const row = {
      id: uid,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      date_of_birth: dob, // DATE accepts 'YYYY-MM-DD'
      address: data.address ?? null,
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_phone: data.emergency_contact_phone ?? null,
      emergency_contact_relationship: data.emergency_contact_relationship ?? null,
      treatment_type: data.treatment_type ?? null,
      // intentionally NOT sending status/sessions_target to avoid schema mismatch
    }

    const { data: prof, error: profErr } = await sb.from("profiles").insert(row).select("*").single()
    if (profErr) {
      await sb.auth.admin.deleteUser(uid) // rollback
      const anyErr = profErr as any
      return problem(400, "Database error creating new user", anyErr?.message, undefined, {
        code: anyErr?.code,
        details: anyErr?.details,
        hint: anyErr?.hint,
        row,
      })
    }

    return NextResponse.json({ user_id: uid, profile: prof }, { status: 201 })
  } catch (e: any) {
    return problem(500, "Unexpected error", e?.message ?? "Unknown error")
  }
}
