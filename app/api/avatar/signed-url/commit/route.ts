// FILE: app/api/avatar/commit/route.ts
import { NextResponse } from "next/server";
import supabaseServer from "@/lib/supabase/server";
import { getAuthUser } from "@/app/api/_utils/auth";

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { path } = await req.json().catch(() => ({}));
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const sb = supabaseServer();
  const { error } = await sb.from("patients").update({ avatar_path: path }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
