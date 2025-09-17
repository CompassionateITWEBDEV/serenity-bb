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
  // Keep as string; we'll normalize. Make sure your DB column type matches if you later insert it.
  date_of_birth: z.string().trim().optional().nullable(),
  emergency_contact_name: z.string().trim().optional().nullable(),
  emergency_contact_phone: z.string().trim().optional().nullable(),
  emergency_contact_relationship: z.string().trim().optional().nullable(),
  treatment_type: z.string().trim().optional().nullable(),
});

function problem(status: number, title: string, detail?: string, fields?: Record<string, string[]>) {
  return new NextResponse(JSON.stringify({ title, detail, status, fields }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

function getAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}
function normalizeDate(s?: string | null) {
  if (!s) return null;
  const v = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // already ISO
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return v;
}

/** Duplicate email check against auth.users (works with service role). */
async function emailExists(admin: SupabaseClient, email: string): Promise<boolean> {
  try {
    const { data, error } = await admin
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)     // auth stores lowercased emails
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.warn('auth.users lookup error:', error);
    }
    return !!data;
  } catch (e) {
    console.warn('auth.users lookup threw:', e);
    return false; // don’t block signup; we’ll still handle duplicate below
  }
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

    // 2) Normalize
    const email = normalizeEmail(parsed.data.email);
    const dob = normalizeDate(parsed.data.date_of_birth);

    // 3) Admin client
    const admin = getAdmin();

    // 4) Short-circuit duplicate (returns 409 clearly)
    if (await emailExists(admin, email)) {
      return problem(409, 'Signup failed', 'Email already registered.');
    }

    // 5) Create Auth user
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.data.first_name,
        last_name:  parsed.data.last_name,
        phone:      parsed.data.phone,
        date_of_birth: dob,
        role: 'patient',
      },
    });

    if (authErr) {
      // Log full context so you can see the root cause in Vercel logs
      console.error('auth.admin.createUser error:', {
        message: authErr.message,
        name: authErr.name,
        status: (authErr as any)?.status,
        error: (authErr as any)?.error,
        error_description: (authErr as any)?.error_description,
      });

      const msg = authErr.message ?? 'Auth error';
      const isDuplicate =
        /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(isDuplicate ? 409 : 400, 'Signup failed',
        isDuplicate ? 'Email already registered.' : msg);
    }

    const userId = created.user?.id;

    // 6) Minimal profile row in `patients` (non-fatal if it fails)
    try {
      await admin.from('patients').insert({
        uid: userId,                // your PK mirrors auth.users.id
        email,
        first_name: parsed.data.first_name,  // rename/remove to match your schema
        last_name:  parsed.data.last_name,   // rename/remove to match your schema
        // phone_number: parsed.data.phone ?? null, // uncomment only if column exists
        // date_of_birth: dob,                      // uncomment only if column type matches
        // is_active: true,                         // uncomment only if column exists
      });
    } catch (dbErr: any) {
      console.error('patients insert (non-fatal) error:', dbErr?.message ?? dbErr);
    }

    // 7) Done
    return NextResponse.json({ ok: true, userId }, { status: 201 });
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    console.error('signup route error:', e);
    return problem(500, 'Internal Server Error', e?.message);
  }
}
