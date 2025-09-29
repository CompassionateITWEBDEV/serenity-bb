import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Body = { email: string; password: string };

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as Body;
    if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user) return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401 });

    const role = (data.user.app_metadata as any)?.role ?? (data.user.user_metadata as any)?.role;
    if (role && role !== "staff") {
      return NextResponse.json({ error: "Not authorized as staff" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email, role: role ?? "staff" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
