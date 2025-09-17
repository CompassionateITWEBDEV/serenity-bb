// app/api/patients/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Use anon key for signup (same pattern as your login route)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Body = {
  email: string;
  password: string;

  // optional extras you’re sending from the form (stored as user_metadata)
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  treatment_type?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // store extra fields in user_metadata
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
        // optional redirect if you have an email-confirmation callback page
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : undefined,
      },
    });

    if (error) {
      const msg = error.message || "Signup failed";
      const isDuplicate =
        /already|exists|taken|registered|duplicate|unique|23505/i.test(msg);
      return NextResponse.json(
        { error: isDuplicate ? "Email already registered" : msg },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    // If email confirmation is required, there will be no session yet.
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
