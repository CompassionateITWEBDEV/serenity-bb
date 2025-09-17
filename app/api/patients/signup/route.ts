// app/api/patients/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth (anon) – same pattern as your login route
const sbAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin (service role) – server-only for DB writes
const sbAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function problem(status: number, title: string, detail?: string) {
  return new NextResponse(JSON.stringify({ title, detail, status }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

// mm/dd/yyyy -> yyyy-mm-dd (leave ISO as-is)
function normalizeDate(s?: string | null) {
  if (!s) return null;
  const v = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  return v; // fallback (if your column is text it will still store)
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();

    // ✅ accept both camelCase and snake_case from the form
    const email = ((raw.email ?? raw.Email) || "").trim().toLowerCase();
    const password = raw.password ?? "";
    const firstName = raw.firstName ?? raw.first_name ?? "";
    const lastName  = raw.lastName  ?? raw.last_name  ?? "";
    const phone     = raw.phoneNumber ?? raw.phone_number ?? raw.phone ?? null;
    const dob       = normalizeDate(raw.dateOfBirth ?? raw.date_of_birth ?? null);
    const ecName    = raw.emergencyContact?.name ?? raw.emergency_contact_name ?? null;
    const ecPhone   = raw.emergencyContact?.phone ?? raw.emergency_contact_phone ?? null;
    const ecRel     = raw.emergencyContact?.relationship ?? raw.emergency_contact_relationship ?? null;
    const plan      = raw.treatmentPlan ?? raw.treatment_type ?? raw.treatment_program ?? "Standard Recovery Program";

    // Basic validation
    if (!email || !password) return problem(400, "Signup failed", "Email and password are required");
    if (password.length < 8) return problem(400, "Signup failed", "Password must be at least 8 characters");
    if (!firstName || !lastName) return problem(400, "Signup failed", "First name and last name are required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return problem(400, "Signup failed", "Please enter a valid email address");

    // 1) Create Auth user with metadata
    const { data, error } = await sbAnon.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "patient",
          first_name: firstName, // store as snake_case in metadata
          last_name:  lastName,
          phone_number: phone,
          date_of_birth: dob,
          emergency_contact_name: ecName,
          emergency_contact_phone: ecPhone,
          emergency_contact_relationship: ecRel,
          treatment_program: plan,
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : undefined,
      },
    });

    if (error) {
      const msg = error.message || "Signup failed";
      const dup = /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(dup ? 409 : 400, "Signup failed", dup ? "Email already registered." : msg);
    }

    if (!data.user) return problem(500, "Signup failed", "User creation failed");
    const userId = data.user.id;

    // 2) Create patient profile with service-role (non-fatal if it fails)
    // Try schema with `uid`, then fallback to `user_id`
    const base = {
      email,
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      date_of_birth: dob,
      emergency_contact_name: ecName,
      emergency_contact_phone: ecPhone,
      emergency_contact_relationship: ecRel,
      treatment_program: plan,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    let insertErr: any = null;

    // Try uid
    let { error: e1 } = await sbAdmin.from("patients").insert({ uid: userId, ...base });
    if (e1) {
      // Fallback to user_id
      const { error: e2 } = await sbAdmin.from("patients").insert({ user_id: userId, ...base });
      insertErr = e2;
    }

    if (insertErr) {
      console.error("patients insert (non-fatal) error:", insertErr.message ?? insertErr);
      // do not block signup if profile fails
    }

    // If your project requires email confirmation, there won't be a session yet
    const requiresEmailConfirmation = !data.session;

    return NextResponse.json(
      {
        success: true,
        requiresEmailConfirmation,
        user: { id: data.user.id, email: data.user.email },
        message: requiresEmailConfirmation
          ? "Please check your email to confirm your account"
          : "Account created successfully",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Signup route error:", err);
    return problem(500, "Internal Server Error", "An unexpected error occurred");
  }
}
