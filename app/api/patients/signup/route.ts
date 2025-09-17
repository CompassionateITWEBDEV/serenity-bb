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
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

function getAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  let admin: SupabaseClient | null = null;
  let userId: string | undefined;

  try {
    // Parse & validate JSON
    const json = await req.json().catch(() => {
      throw problem(400, 'Invalid JSON', 'Request body must be valid JSON.');
    });

    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join('.') || 'body';
        (fields[k] ??= []).push(issue.message);
      }
      return problem(400, 'Invalid input', 'One or more fields are invalid.', fields);
    }
    const input = parsed.data;

    // Admin client (service role)
    admin = getAdmin();

    // 1) Create Auth user
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

    userId = created.user?.id;

    // 2) Profile row in patients (optional but common)
    if (userId) {
      const { error: dbErr } = await admin.from('patients').insert({
        id: userId, // if patients.id mirrors auth.users.id (UUID)
        email: input.email,
        full_name: `${input.first_name} ${input.last_name}`,
        phone_number: input.phone ?? null,
        date_of_birth: input.date_of_birth ?? null,
        is_active: true,
        // add other existing columns here if needed
      });

      if (dbErr) {
        // Best-effort rollback to avoid orphaned auth users
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        return problem(500, 'Profile creation failed', dbErr.message);
      }
    }

    return NextResponse.json({ ok: true, userId }, { status: 201 });
  } catch (e: any) {
    // If we deliberately threw a Problem response above, return it as-is
    if (e instanceof NextResponse) return e;

    console.error('signup route error', e);
    return problem(500, 'Internal Server Error', e?.message);
  }
}
