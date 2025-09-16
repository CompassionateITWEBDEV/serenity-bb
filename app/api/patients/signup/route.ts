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
  date_of_birth: z.string().optional().nullable(), // 'YYYY-MM-DD' or 'MM/DD/YYYY'
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
    const month = mm.padStart(2, '0');
    const day = dd.padStart(2, '0');
    return `${yyyy}-${month}-${day}`;
  }
  return null;
}

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>, meta?: Record<string, unknown>) {
  return NextResponse.json(
    { type: 'about:blank', title, status, detail, fields, meta },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/**
 * Map API payload keys → actual DB column names.
 * If your table uses different names (e.g., phone_number), change values on the right.
 */
const PROFILE_COL_MAP: Record<string, string> = {
  id: 'id',
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  phone: 'phone',                                      // ← change to 'phone_number' if needed
  date_of_birth: 'date_of_birth',
  address: 'address',
  emergency_contact_name: 'emergency_contact_name',    // ← change if your table differs
  emergency_contact_phone: 'emergency_contact_phone',
  emergency_contact_relationship: 'emergency_contact_relationship',
  treatment_type: 'treatment_type',
  status: 'status',                                    // remove if your table has no 'status'
  sessions_target: 'sessions_target',                  // remove if your table has no 'sessions_target'
};

function toProfileRow(data: z.infer<typeof SignupSchema> & { id: string }, dobISO: string | null) {
  // Why: Only include columns that exist in PROFILE_COL_MAP to avoid "column does not exist".
  const base: Record<string, unknown> = {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone ?? null,
    date_of_birth: dobISO, // Postgres DATE accepts 'YYYY-MM-DD'
    address: data.address ?? null,
    emergency_contact_name: data.emergency_contact_name ?? null,
    emergency_contact_phone: data.emergency_contact_phone ?? null,
    emergency_contact_relationship: data.emergency_contact_relationship ?? null,
    treatment_type: data.treatment_type ?? null,
    status: 'Active',        // change/remove if your table expects different values
    sessions_target: 40,     // change/remove if your table has a different default/type
  };

  const row: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(base)) {
    const col = PROFILE_COL_MAP[key];
    if (!col) continue;      // skip keys not present in your table
    row[col] = val;
  }
  return row;
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

    const dobISO = toISODate(data.date_of_birth);
    if (dobISO) {
      const d = new Date(dobISO);
      const today = new Date(new Date().toISOString().slice(0, 10));
      if (d > today) return problem(422, 'Invalid date of birth', 'Date of birth cannot be in the future', { date_of_birth: ['Future date'] });
    }

    let sbAdmin;
    try {
      sbAdmin = getSbAdmin();
    } catch (e: any) {
      return problem(500, 'Supabase misconfiguration', e?.message || 'Missing SUPABASE env vars');
    }

    // 1) Create auth user
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

    // 2) Insert profile
    const row = toProfileRow({ ...data, id: uid }, dobISO);
    const { data: prof, error: profErr } = await sbAdmin
      .from('profiles')
      .insert(row)
      .select('*')
      .single();

    if (profErr) {
      // rollback auth user on failure
      await sbAdmin.auth.admin.deleteUser(uid);
      // bubble up real Postgres details so you can fix schema quickly
      const anyErr = profErr as any;
      return problem(
        400,
        'Database error creating new user',
        anyErr?.message ?? 'Insert failed',
        undefined,
        { code: anyErr?.code, details: anyErr?.details, hint: anyErr?.hint, schema: 'public', table: 'profiles', row },
      );
    }

    return NextResponse.json({ user_id: uid, profile: prof }, { status: 201 });
  } catch (e: any) {
    return problem(500, 'Unexpected error', e?.message ?? 'Unknown error');
  }
}
