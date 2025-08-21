// app/api/patients/login/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Body = {
  email: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as Body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // ✅ Use Supabase Auth sign-in
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (e: any) {
    console.error("❌ Login failed:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
