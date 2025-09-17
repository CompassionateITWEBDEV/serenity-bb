// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name:  z.string().trim().min(1, 'Last name is required'),
  email:      z.string().email('Valid email required'),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  phone:      z.string().trim().optional().nullable(),
  date_of_birth: z.string().trim().optional().nullable(), // YYYY-MM-DD (ensure matches your column type if used)
  emergency_contact_name: z.string().trim().optional().nullable(),
  emergency_contact_phone: z.string().trim().optional().nullable(),
  emergency_contact_relationship: z.string().trim().optional().nullable(),
  treatment_type: z.string().trim().optional().nullable(),
});

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>) {
  return new NextResponse(
    JSON.stringify({ title, detail, status, fields }),
    { status, headers: { 'content-type': 'application/problem+json' } }
  );
}

function getAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Fast duplicate-email check against auth.users (service role can read the auth schema). */
async function emailExists(admin: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await admin
    .schema('auth')
    .from('users')
    .select('id')
    .ilike('email', email)   // case-insensitive match
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // "Results contain 0 rows"
    console.warn('auth.users lookup error:', error);
  }
  return !!data;
}

export async function POST(req: Request) {
  try {
    // 1) Parse + validate
    const raw = await req.json().catch(() =>
      problem(400, 'Invalid JSON', 'Request body must be valid JSON.')
    );
    if (raw instanceof NextResponse) return raw;

    const parsed = Body.safeParse(raw);
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

    // 3) Short-circuit if email already exists (clear 409 instead of vague DB error)
    if (await emailExists(admin, input.email)) {
      return problem(409, 'Signup failed', 'Email already registered.');
    }

    // 4) Create Auth user
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
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
      console.error('auth.admin.createUser error:', {
        message: authErr.message,
        name: authErr.name,
        status: (authErr as any)?.status,
        error: (authErr as any)?.error,
        error_description: (authErr as any)?.error_description,
      });

      const msg = authErr.message ?? 'Auth error';
      const isDuplicate =
        /already|exists|taken|registered|duplicate|unique/i.test(msg) || /23505/.test(msg);
      const status = isDuplicate ? 409 : 400;
      const detail = isDuplicate ? 'Email already registered.' : msg;

      return problem(status, 'Signup failed', detail);
    }

    const userId = created.user?.id;

    // 5) Best-effort profile insert in `patients` with uid = auth.users.id
    //    Keep this MINIMAL so it succeeds even if your schema is lean;
    //    expand with more columns only if they exist in your table.
    try {
      await admin.from('patients').insert({
        uid: userId,                 // PK mirrors auth.users.id (your choice)
        email: input.email,
        first_name: input.first_name, // remove if your table uses full_name instead
        last_name:  input.last_name,  // remove if your table uses full_name instead
        // phone_number: input.phone ?? null,         // uncomment only if column exists
        // date_of_birth: input.date_of_birth ?? null // uncomment only if column exists
        // is_active: true,                            // uncomment only if column exists
      });
    } catch (dbErr: any) {
      console.error('patients insert (non-fatal) error:', dbErr?.message ?? dbErr);
      // Don’t block signup; you can backfill profile later.
    }

    // 6) Success
    return NextResponse.json({ ok: true, userId }, { status: 201 });
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    console.error('signup route error:', e);
    return problem(500, 'Internal Server Error', e?.message);
  }
}
