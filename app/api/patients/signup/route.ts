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

const toISO = (s?: string | null) => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
};

const problem = (status:number, title:string, detail?:string, fields?:Record<string,string[]>, meta?:Record<string,unknown>) =>
  NextResponse.json({ type:'about:blank', title, status, detail, fields, meta }, { status });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return problem(422, 'Invalid signup data', 'Fix highlighted fields', flat.fieldErrors);
    }
    const d = parsed.data;

    const dob = toISO(d.date_of_birth);
    if (dob) {
      const today = new Date(new Date().toISOString().slice(0,10));
      if (new Date(dob) > today) return problem(422,'Invalid date of birth','Date of birth cannot be in the future',{date_of_birth:['Future date']});
    }

    let sb;
    try { sb = getSbAdmin(); } catch (e:any) { return problem(500,'Supabase misconfiguration', e?.message); }

    // 1) Create auth user
    const { data: created, error: authErr } = await sb.auth.admin.createUser({
      email: d.email, password: d.password, email_confirm: true,
      user_metadata: { first_name: d.first_name, last_name: d.last_name },
    });
    if (authErr || !created?.user) {
      const msg = authErr?.message ?? 'Failed to create auth user';
      return problem(/exist|taken|already/i.test(msg)?409:400, 'Auth error', msg, { email:[msg] });
    }
    const uid = created.user.id;

    // 2) Try to insert profile (SAFE columns). If it fails, DO NOT block signup.
    const row = {
      id: uid, first_name: d.first_name, last_name: d.last_name, email: d.email,
      phone: d.phone ?? null, date_of_birth: dob, address: d.address ?? null,
      emergency_contact_name: d.emergency_contact_name ?? null,
      emergency_contact_phone: d.emergency_contact_phone ?? null,
      emergency_contact_relationship: d.emergency_contact_relationship ?? null,
      treatment_type: d.treatment_type ?? null,
    };

    const { error: profErr, data: prof } = await sb.from('profiles').insert(row).select('*').maybeSingle();

    // If insert fails due to schema mismatch, still succeed so the client can create profile on first login.
    if (profErr) {
      // Optional: comment out to keep the auth user even if profile fails.
      // await sb.auth.admin.deleteUser(uid)  // ← remove rollback to allow login
      return NextResponse.json({ user_id: uid, profile_created: false, reason: profErr.message }, { status: 201 });
    }

    return NextResponse.json({ user_id: uid, profile_created: true, profile: prof }, { status: 201 });
  } catch (e:any) {
    return problem(500, 'Unexpected error', e?.message ?? 'Unknown error');
  }
}
