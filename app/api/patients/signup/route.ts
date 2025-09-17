// app/api/patients/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Use the anon key for Auth signup (same as your login route)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    const b = (await req.json()) as Body;

    const email = (b.email || "").trim().toLowerCase();
    const password = b.password || "";

    if (!email || !password) {
      return problem(400, "Signup failed", "Email and password are required");
    }
    if (password.length < 8) {
      return problem(400, "Signup failed", "Password must be at least 8 characters");
    }

    // 🔐 Create the Auth user & store extras in user_metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: b.first_name ?? null,
          last_name: b.last_name ?? null,
          phone: b.phone ?? null,
          date_of_birth: b.date_of_birth ?? null,
          emergency_contact_name: b.emergency_contact_name ?? null,
          emergency_contact_phone: b.emergency_contact_phone ?? null,
          emergency_contact_relationship: b.emergency_contact_relationship ?? null,
          treatment_type: b.treatment_type ?? null,
          role: "patient",
        },
        // If you have an auth callback page configured:
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : undefined,
      },
    });

    if (error) {
      // Map duplicate/unique constraint to 409; otherwise 400 with real message
      const msg = error.message || "Signup failed";
      const isDup = /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(isDup ? 409 : 400, "Signup failed", isDup ? "Email already registered." : msg);
    }

    // If email confirmation is required, there won't be a session yet
    const requiresEmailConfirmation = !data.session;

    return NextResponse.json(
      {
        ok: true,
        requiresEmailConfirmation,
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("❌ Signup failed:", e?.message ?? e);
    return problem(500, "Internal Server Error", "Unexpected server error");
  }
}
