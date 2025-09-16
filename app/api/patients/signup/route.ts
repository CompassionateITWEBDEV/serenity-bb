// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSbAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

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
});

function normalize(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    dateOfBirth: 'date_of_birth',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
    emergencyContactRelationship: 'emergency_contact_relationship',
    treatmentType: 'treatment_type',
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) out[map[k] ?? k] = v;
  return out;
}

function toISODate(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>) {
  // Why: consistent, readable error bodies in the Network tab
  return NextResponse.json(
    { type: 'about:blank', title, status, detail, fields },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

export async function POST(req: Request) {
  try {
    // 1) Parse body (JSON or FormData)
    const ct = req.headers.get('content-type') || '';
    let raw: Record<string, unknown> = {};
    if (ct.includes('application/json')) {
      raw = (await req.json()) as Record<string, unknown>;
    } else if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData();
      fd.forEach((v, k) => (raw[k] = typeof v === 'string' ? v : (v as File).name));
    } else {
      return problem(415, 'Unsupported Media Type', `content-type: ${ct}`);
    }

    // 2) Normalize & validate
    const normalized = normalize(raw);
    const parsed = SignupSchema.safeParse(normalized);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return problem(422, 'Invalid signup data', 'Fix the highlighted fields', flat.fieldErrors);
    }
    const data = parsed.data;

    // 3) DOB guard
    const dob = toISODate(data.date_of_birth);
    if (dob) {
      const d = new Date(dob);
      const today = new Date(new Date().toISOString().slice(0, 10));
      if (d > today) return problem(422, 'Invalid date of birth', 'Date of birth cannot be in the future', { date_of_birth: ['Future date'] });
    }

    // 4) Admin client (lazy)
    let sbAdmin;
    try {
      sbAdmin = getSbAdmin();
    } catch (e: any) {
      return problem(500, 'Server misconfiguration', e?.message);
    }

    // 5) Create auth user (map duplicate → 409)
    const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create user';
      const status = /exist|taken|already/i.test(msg) ? 409 : 400;
      return problem(status, 'Auth error', msg, { email: [msg] });
    }
    const uid = created.user.id;

    // 6) Insert profile (rollback on error)
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
      status: 'Active',
      sessions_target: 40,
    };

    const { data: prof, error: profErr } = await sbAdmin.from('profiles').insert(payload).select('*').single();
    if (profErr) {
      await sbAdmin.auth.admin.deleteUser(uid);
      return problem(400, 'Database error', profErr.message);
    }

    return NextResponse.json({ user_id: uid, profile: prof }, { status: 201 });
  } catch (e: any) {
    return problem(500, 'Unexpected error', e?.message ?? 'Unknown error');
  }
}
