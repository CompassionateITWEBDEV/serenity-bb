// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSbAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs'; // Service role + process.env require Node.

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

type Incoming =
  | Record<string, unknown>
  | FormData;

function normalizePayload(input: Record<string, unknown>): Record<string, unknown> {
  // Why: Many UIs use camelCase; normalize to schema’s snake_case.
  const map: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    dateOfBirth: 'date_of_birth',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
    emergencyContactRelationship: 'emergency_contact_relationship',
    treatmentType: 'treatment_type',
    // keep identical keys as-is
    first_name: 'first_name',
    last_name: 'last_name',
    date_of_birth: 'date_of_birth',
    emergency_contact_name: 'emergency_contact_name',
    emergency_contact_phone: 'emergency_contact_phone',
    emergency_contact_relationship: 'emergency_contact_relationship',
    treatment_type: 'treatment_type',
    email: 'email',
    password: 'password',
    phone: 'phone',
    address: 'address',
  };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const key = map[k] ?? k;
    out[key] = v;
  }
  return out;
}

function toISODate(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    const iso = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // --- Parse body (supports JSON or FormData)
    const ct = req.headers.get('content-type') || '';
    let raw: Record<string, unknown> = {};
    if (ct.includes('application/json')) {
      raw = (await req.json()) as Record<string, unknown>;
    } else if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData();
      fd.forEach((v, k) => {
        raw[k] = typeof v === 'string' ? v : (v as File).name;
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type', details: { contentType: ct } },
        { status: 415 },
      );
    }

    const normalized = normalizePayload(raw);

    // --- Validate
    const parsed = SignupSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid signup data', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // --- DOB guard
    const dob = toISODate(data.date_of_birth);
    if (dob) {
      const d = new Date(dob);
      const today = new Date(new Date().toISOString().slice(0, 10));
      if (d > today) {
        return NextResponse.json({ error: 'Date of birth cannot be in the future' }, { status: 400 });
      }
    }

    // --- Supabase admin (lazy env read)
    let sbAdmin;
    try {
      sbAdmin = getSbAdmin();
    } catch (err: any) {
      // Why: Surface misconfiguration clearly in non-prod.
      const msg = process.env.NODE_ENV === 'production' ? 'Server misconfiguration' : err?.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // --- 1) Create auth user
    const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create auth user';
      const status = /exist|taken|already/i.test(msg) ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
    const uid = created.user.id;

    // --- 2) Insert profile
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
      return NextResponse.json({ error: `Database error creating new user: ${profErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ user_id: uid, profile: prof }, { status: 201 });
  } catch (e: any) {
    const message = e?.message ?? 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
