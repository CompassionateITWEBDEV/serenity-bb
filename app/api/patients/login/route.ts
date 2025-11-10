// app/api/patients/login/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy-load supabase client to avoid build-time errors when env vars aren't available
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error("Supabase configuration missing");
  }
  
  return createClient(url, anonKey);
}

type Body = {
  email: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { email, password } = (await req.json()) as Body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // ✅ Correct login method
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
