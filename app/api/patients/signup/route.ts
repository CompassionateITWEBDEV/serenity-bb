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
  date_of_birth: z.string().trim().optional().nullable(), // "YYYY-MM-DD" or "MM/DD/YYYY"
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
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Normalize "MM/DD/YYYY" -> "YYYY-MM-DD"
function normalizeDate(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // US style
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const [_, mm, dd, yyyy] = m;
    const mm2 = String(mm).padStart(2, '0');
    const dd2 = String(dd).padStart(2, '0');
    return `${yyyy}-${mm2}-${dd2}`;
  }
  return s; // fallback (DB may still accept if it's text)
}

// Check duplicates directly in auth.users (service role can read auth schema)
async function emailExists(admin: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await admin
    .schema('auth')
    .from('users')
    .select('id')
    .eq('email', email) // emails are stored lowercased in auth
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.warn('auth.users lookup error:', error);
  }
  return !!data;
}

export async function POST(req: Request) {
  try {
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
    const admin = getAdmin();

    // Normalize email & DOB
    const email = input.email.trim().toLowerCase();
    const dob = normalizeDate(input.date_of_birth);

    // Fast duplicate short-circuit (clear 409 instead of vague DB error)
    if (await emailExists(admin, email)) {
      return problem(409, 'Signup failed', 'Email already registered.');
    }

    // Create Auth user
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.first_name,
        last_name:  input.last_name,
        phone:      input.phone,
        date_of_birth: dob,
        role: 'patient',
      },
    });

    if (authErr) {
      console.error('createUser error:', {
        message: authErr.message,
        status: (authErr as any)?.status,
        error: (authErr as any)?.error,
        error_description: (authErr as any)?.error_description,
      });
      const msg = authErr.message ?? 'Auth error';
      const isDuplicate = /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(isDuplicate ? 409 : 400, 'Signup failed', isDuplicate ? 'Email already registered.' : msg);
    }

    const userId = created.user?.id;

    // Minimal profile insert (non-fatal)
    try {
      await admin.from('patients').insert({
        uid: userId,          // you said your PK is `uid` mirroring auth.users.id
        email,
        first_name: input.first_name, // adjust to your columns (or use full_name)
        last_name:  input.last_name,
        // phone_number: input.phone ?? null,      // uncomment only if column exists
        // date_of_birth: dob,                     // uncomment only if column exists (DATE or TEXT)
        // is_active: true,                        // uncomment only if column exists
      });
    } catch (dbErr: any) {
      console.error('patients insert (non-fatal) error:', dbErr?.message ?? dbErr);
    }

    return NextResponse.json({ ok: true, userId }, { status: 201 });
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    console.error('signup route error:', e);
    return problem(500, 'Internal Server Error', e?.message);
  }
}
