// app/api/patients/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazy-load admin client to avoid build-time errors when env vars aren't available
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration missing");
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function problem(status: number, title: string, detail?: string) {
  return new NextResponse(JSON.stringify({ title, detail, status }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

const toISO = (s?: string | null) => {
  if (!s) return null;
  const v = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : v;
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("Environment check:", {
      supabaseUrl: supabaseUrl ? "SET" : "MISSING",
      serviceRoleKey: serviceRoleKey ? `SET (${serviceRoleKey.length} chars)` : "MISSING",
      serviceRoleKeyStart: serviceRoleKey ? serviceRoleKey.substring(0, 20) + "..." : "N/A"
    });
    
    const admin = getAdminClient();
    const raw = await req.json();
    console.log("Patient signup request:", JSON.stringify(raw, null, 2));

    // accept camelCase or snake_case
    const email = ((raw.email ?? "").trim().toLowerCase()) as string;
    const password = (raw.password ?? "") as string;
    const firstName = (raw.firstName ?? raw.first_name ?? "") as string;
    const lastName  = (raw.lastName  ?? raw.last_name  ?? "") as string;
    const phone     = (raw.phoneNumber ?? raw.phone_number ?? raw.phone ?? null) as string | null;
    const dob       = toISO(raw.dateOfBirth ?? raw.date_of_birth ?? null);
    const ecName    = (raw.emergencyContact?.name ?? raw.emergency_contact_name ?? null) as string | null;
    const ecPhone   = (raw.emergencyContact?.phone ?? raw.emergency_contact_phone ?? null) as string | null;
    const ecRel     = (raw.emergencyContact?.relationship ?? raw.emergency_contact_relationship ?? null) as string | null;
    const plan      = (raw.treatmentPlan ?? raw.treatment_type ?? raw.treatment_program ?? "Standard Recovery Program") as string;

    console.log("Parsed fields:", {
      email: email ? "***" : "missing",
      password: password ? "***" : "missing", 
      firstName: firstName || "missing",
      lastName: lastName || "missing",
      phone: phone || "null",
      dob: dob || "null",
      ecName: ecName || "null",
      ecPhone: ecPhone || "null", 
      ecRel: ecRel || "null",
      plan: plan || "missing"
    });

    // basic validation
    if (!email || !password) return problem(400, "Signup failed", "Email and password are required");
    if (password.length < 8) return problem(400, "Signup failed", "Password must be at least 8 characters");
    if (!firstName || !lastName) return problem(400, "Signup failed", "First name and last name are required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return problem(400, "Signup failed", "Please enter a valid email");

    // 1) Create verified Auth user (no “Email not confirmed”)
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "patient",
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        date_of_birth: dob,
        emergency_contact_name: ecName,
        emergency_contact_phone: ecPhone,
        emergency_contact_relationship: ecRel,
        treatment_program: plan,
      },
    });

    if (authErr) {
      console.error("Auth creation error:", authErr);
      const msg = authErr.message || "Auth error";
      const dup = /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(dup ? 409 : 400, "Signup failed", dup ? "Email already registered." : msg);
    }
    const userId = created.user?.id;
    if (!userId) return problem(500, "Signup failed", "User creation failed");

    // 2) Create patient profile (service-role bypasses RLS). Try `uid` then `user_id`.
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

    let { error: e1 } = await admin.from("patients").insert({ uid: userId, ...base });
    if (e1) {
      console.log("First insert failed, trying with user_id:", e1.message);
      const { error: e2 } = await admin.from("patients").insert({ user_id: userId, ...base });
      if (e2) {
        console.error("Both patient inserts failed:", e2.message ?? e2);
        // Don't fail the signup for this, just log it
      }
    }

    // success: no email confirmation required
    return NextResponse.json(
      {
        ok: true,
        requiresEmailConfirmation: false,
        user: { id: created.user!.id, email: created.user!.email },
        message: "Account created successfully",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("signup route error:", err);
    return problem(500, "Internal Server Error", err?.message ?? "Unexpected error");
  }
}
