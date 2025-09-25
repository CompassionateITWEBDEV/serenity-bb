import { NextResponse } from "next/server";
import supabaseServer from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await req.json().catch(() => ({} as any));
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const { error } = await sb.from("patients")
    .update({ avatar_path: path })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
