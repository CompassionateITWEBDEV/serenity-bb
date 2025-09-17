import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return problem(400, "Signup failed", "Email and password are required");
    }
    if (password.length < 8) {
      return problem(400, "Signup failed", "Password must be at least 8 characters");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
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
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : undefined,
      },
    });

    if (error) {
      const msg = error.message || "Signup failed";
      const duplicate = /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return problem(duplicate ? 409 : 400, "Signup failed",
        duplicate ? "Email already registered." : msg);
    }

    // If email confirmation is required, there is no session yet
    return NextResponse.json(
      {
        ok: true,
        requiresEmailConfirmation: !data.session,
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("❌ Signup failed:", e?.message ?? e);
    return problem(500, "Internal Server Error", "Unexpected server error");
  }
}
