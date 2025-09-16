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
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  treatment_type: z.string().optional().nullable(),
});

function toISODate(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>) {
  return NextResponse.json(
    { type: 'about:blank', title, status, detail, fields },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return problem(422, 'Invalid signup data', 'Fix the highlighted fields', flat.fieldErrors);
    }
    const data = parsed.data;

    const dob = toISODate(data.date_of_birth);
    if (dob) {
      const d = new Date(dob);
      const today = new Date(new Date().toISOString().slice(0, 10));
      if (d > today) return problem(422, 'Invalid date of birth', 'Date of birth cannot be in the future', { date_of_birth: ['Future date'] });
    }

    let sbAdmin;
    try {
      sbAdmin = getSbAdmin();
    } catch (e: any) {
      // Why: Make missing-var obvious in all envs, but no values leaked.
      return problem(500, 'Supabase misconfiguration', e?.message || 'Missing SUPABASE env vars');
    }

    const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create auth user';
      const status = /exist|taken|already/i.test(msg) ? 409 : 400;
      return problem(status, 'Auth error', msg, { email: [msg] });
    }
    const uid = created.user.id;

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
