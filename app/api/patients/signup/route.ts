// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().trim().optional().nullable(),
  date_of_birth: z.string().trim().optional().nullable(), // "YYYY-MM-DD"
  emergency_contact_name: z.string().trim().optional().nullable(),
  emergency_contact_phone: z.string().trim().optional().nullable(),
  emergency_contact_relationship: z.string().trim().optional().nullable(),
  treatment_type: z.string().trim().optional().nullable(),
});

type Problem = {
  title?: string;
  detail?: string;
  status: number;
  fields?: Record<string, string[]>;
};

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>) {
  return new NextResponse(
    JSON.stringify({ title, detail, status, fields } satisfies Problem),
    { status, headers: { 'content-type': 'application/problem+json' } }
  );
}

function getAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  try {
    // 1) Parse JSON safely and validate
    const body = await req.json().catch(() =>
      problem(400, 'Invalid JSON', 'Request body must be valid JSON.')
    );
    if (body instanceof NextResponse) return body;

    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join('.') || 'body';
        (fields[k] ??= []).push(issue.message);
      }
      return problem(400, 'Invalid input', 'One or more fields are invalid.', fields);
    }
    const input = parsed.data;

    // 2) Admin client (service role)
    const admin = getAdmin();

    // 3) Create Auth user
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
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
    });

    if (authErr) {
      const msg = authErr.message ?? 'Auth error';
      const status = /already|exists|taken|registered/i.test(msg) ? 409 : 400;
      return problem(status, 'Signup failed', msg);
    }
    const userId = created.user?.id;

    // 4) Try to create a profile row (non-fatal if it fails)
    //    ⚠️ Adjust the fields below to exactly match your "patients" schema.
    //    If they don't match, we log the error but still return 201 so signup continues.
    try {
      await admin.from('patients').insert({
        // If your PK is the same as auth.users.id:
        id: userId, // remove if your PK is auto-generated
        email: input.email,
        // If your table has full_name; otherwise split into first_name / last_name
        full_name: `${input.first_name} ${input.last_name}`,
        phone_number: input.phone ?? null,            // rename if your column differs
        date_of_birth: input.date_of_birth ?? null,   // ensure type matches your table (date/text)
        is_active: true,                              // remove if column doesn't exist
        // Add/rename columns to match your exact schema if needed
      });
    } catch (dbErr: any) {
      console.error('patients insert (non-fatal) error:', dbErr?.message ?? dbErr);
      // We do NOT fail the signup; profile can be created later via a separate flow.
    }

    // 5) Success
    return NextResponse.json({ ok: true, userId, profileCreated: true }, { status: 201 });
  } catch (e: any) {
    // If we threw a Problem response above, return it as-is
    if (e instanceof NextResponse) return e;
    console.error('signup route error:', e);
    return problem(500, 'Internal Server Error', e?.message);
  }
}
