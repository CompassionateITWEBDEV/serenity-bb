// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  treatment_type: z.string().optional().nullable(),
});

function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // return a clear 500 so you can see it in logs
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  try {
    const input = Body.parse(await req.json());
    const admin = getAdmin();

    // 1) Create Auth user (server-side)
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email:     input.email,
      password:  input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.first_name,
        last_name:  input.last_name,
        phone:      input.phone,
        date_of_birth: input.date_of_birth,
        role: 'patient',
      },
    });
    if (authErr) {
      const msg = authErr.message ?? 'Auth error';
      const status = /already|exists|taken/i.test(msg) ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
    const userId = created.user?.id;

    // 2) Optional: insert profile into `patients` (make sure RLS allows service role)
    await admin.from('patients').insert({
      id: userId, // if your patients.id mirrors auth.users.id (UUID)
      email: input.email,
      full_name: `${input.first_name} ${input.last_name}`,
      phone_number: input.phone ?? null,
      date_of_birth: input.date_of_birth ?? null,
      is_active: true,
      // add other columns that exist in your schema…
    });

    return NextResponse.json({ ok: true, userId }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) {
      // zod errors → 400
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 });
    }
    console.error('signup route error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal Server Error' }, { status: 500 });
  }
}
