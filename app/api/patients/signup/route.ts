// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSbAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const SignupSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  treatment_type: z.string().optional().nullable(),
});

function normalizePayload(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    dateOfBirth: 'date_of_birth',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
    emergencyContactRelationship: 'emergency_contact_relationship',
    treatmentType: 'treatment_type',
    // keep identical keys as-is
    first_name: 'first_name',
    last_name: 'last_name',
    date_of_birth: 'date_of_birth',
    emergency_contact_name: 'emergency_contact_name',
    emergency_contact_phone: 'emergency_contact_phone',
    emergency_contact_relationship: 'emergency_contact_relationship',
    treatment_type: 'treatment_type',
    email: 'email',
    password: 'password',
    phone: 'phone',
    address: 'address',
  };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const key = map[k] ?? k;
    out[key] = v;
  }
  return out;
}

function toISODate(input?: string | null) {
  if (!input) return null;
  
  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  
  // Handle MM/DD/YYYY format
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    const month = mm.padStart(2, '0');
    const day = dd.padStart(2, '0');
    return `${yyyy}-${month}-${day}`;
  }
  
  // Try to parse as Date and convert
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  
  return null;
}

export async function POST(req: Request) {
  try {
    // Parse body
    const ct = req.headers.get('content-type') || '';
    let raw: Record<string, unknown> = {};
    
    if (ct.includes('application/json')) {
      raw = (await req.json()) as Record<string, unknown>;
    } else if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData();
      fd.forEach((v, k) => {
        raw[k] = typeof v === 'string' ? v : (v as File).name;
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type', details: { contentType: ct } },
        { status: 415 },
      );
    }

    // Add debug logging
    console.log('Raw payload received:', raw);

    const normalized = normalizePayload(raw);
    console.log('Normalized payload:', normalized);

    // Validate
    const parsed = SignupSchema.safeParse(normalized);
    if (!parsed.success) {
      console.log('Validation failed:', parsed.error.flatten());
      return NextResponse.json(
        { 
          error: 'Invalid signup data', 
          issues: parsed.error.flatten(),
          details: parsed.error.issues
        },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // DOB validation with better error handling
    const dob = toISODate(data.date_of_birth);
    console.log('Parsed DOB:', { original: data.date_of_birth, parsed: dob });
    
    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
      
      if (dobDate > today) {
        return NextResponse.json(
          { 
            error: 'Date of birth cannot be in the future',
            details: { providedDate: dob, todayDate: today.toISOString().slice(0, 10) }
          }, 
          { status: 400 }
        );
      }
      
      // Check if person is too young (optional - adjust age limit as needed)
      const ageDiff = today.getTime() - dobDate.getTime();
      const age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 0) {
        return NextResponse.json(
          { error: 'Invalid date of birth' },
          { status: 400 }
        );
      }
    }

    // Supabase admin
    let sbAdmin;
    try {
      sbAdmin = getSbAdmin();
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Server misconfiguration' : err?.message;
      console.error('Supabase admin error:', err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Create auth user
    const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { 
        first_name: data.first_name, 
        last_name: data.last_name 
      },
    });

    if (createErr || !created?.user) {
      console.error('Auth user creation failed:', createErr);
      const msg = createErr?.message ?? 'Failed to create auth user';
      const status = /exist|taken|already/i.test(msg) ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
    const uid = created.user.id;

    // Insert profile
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

    console.log('Profile payload:', payload);

    const { data: prof, error: profErr } = await sbAdmin
      .from('profiles')
      .insert(payload)
      .select('*')
      .single();
      
    if (profErr) {
      console.error('Profile creation failed:', profErr);
      // Cleanup auth user if profile creation fails
      await sbAdmin.auth.admin.deleteUser(uid);
      return NextResponse.json(
        { 
          error: `Database error creating profile: ${profErr.message}`,
          details: profErr
        }, 
        { status: 400 }
      );
    }

    console.log('User created successfully:', { uid, profile: prof });
    return NextResponse.json({ user_id: uid, profile: prof }, { status: 201 });
    
  } catch (e: any) {
    console.error('Unexpected error in signup:', e);
    const message = e?.message ?? 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
