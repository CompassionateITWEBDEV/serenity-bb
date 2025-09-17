// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // ensure Node, not Edge, if using Node-only libs

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server only
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const data = bodySchema.parse(payload);

    // Example: create a user as "patient"
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      user_metadata: { name: data.name, role: 'patient' },
      email_confirm: true, // or false, depending on your flow
    });

    if (error) {
      // Return a 400 for expected auth errors (duplicate email, password policy, etc.)
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ userId: created.user?.id }, { status: 201 });
  } catch (err: any) {
    // If zod validation fails, send 400
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error('signup error', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
