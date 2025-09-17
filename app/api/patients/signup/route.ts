// app/api/patients/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use service role key for server-side operations that need elevated permissions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the key change
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

type Body = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  treatment_type?: string | null;
};

function problem(status: number, title: string, detail?: string) {
  return new NextResponse(JSON.stringify({ title, detail, status }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    // Validation
    if (!email || !password) {
      return problem(400, "Signup failed", "Email and password are required");
    }
    
    if (password.length < 8) {
      return problem(400, "Signup failed", "Password must be at least 8 characters");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return problem(400, "Signup failed", "Please enter a valid email address");
    }

    // Create the Auth user with service role key
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
        phone: body.phone ?? null,
        date_of_birth: body.date_of_birth ?? null,
        emergency_contact_name: body.emergency_contact_name ?? null,
        emergency_contact_phone: body.emergency_contact_phone ?? null,
        emergency_contact_relationship: body.emergency_contact_relationship ?? null,
        treatment_type: body.treatment_type ?? null,
        role: "patient",
      },
      email_confirm: true // Auto-confirm email for service role
    });

    if (authError) {
      console.error("Auth signup error:", authError);
      const msg = authError.message || "Signup failed";
      const isDup = /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(isDup ? 409 : 400, "Signup failed", isDup ? "Email already registered." : msg);
    }

    if (!authData.user) {
      return problem(500, "Signup failed", "Failed to create user account");
    }

    // If you have a separate patients table, insert the record here
    // Example:
    /*
    const { error: profileError } = await supabase
      .from('patients')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        date_of_birth: body.date_of_birth,
        emergency_contact_name: body.emergency_contact_name,
        emergency_contact_phone: body.emergency_contact_phone,
        emergency_contact_relationship: body.emergency_contact_relationship,
        treatment_type: body.treatment_type,
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Cleanup: delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return problem(500, "Signup failed", "Failed to create user profile");
    }
    */

    return NextResponse.json(
      {
        ok: true,
        requiresEmailConfirmation: false, // Since we auto-confirm with service role
        user: { 
          id: authData.user.id, 
          email: authData.user.email,
          user_metadata: authData.user.user_metadata
        },
        message: "Account created successfully"
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Signup route error:", error);
    return problem(500, "Internal Server Error", "Unexpected server error occurred");
  }
}
