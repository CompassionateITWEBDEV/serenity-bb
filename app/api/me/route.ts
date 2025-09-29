import { NextResponse } from "next/server";
import createServer, { supabaseForToken } from "@/lib/supabase/server";

type EnsureBody = {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
};

function pickToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

async function getClients(req: Request) {
  const token = pickToken(req);
  const sb = token ? supabaseForToken(token) : createServer();
  return { sb, token };
}

export async function GET(req: Request) {
  try {
    const { sb } = await getClients(req);
    const { data: { user }, error } = await sb.auth.getUser();
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });

    if (!user) return NextResponse.json({ user: null, patient: null }, { status: 200 });

    const { data: patient, error: pe } = await sb
      .from("patients")
      .select("user_id, full_name, first_name, last_name, email, phone_number, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ user, patient: patient ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as EnsureBody;
    const { sb } = await getClients(req);

    const { data: { user }, error: uErr } = await sb.auth.getUser();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Check existing
    const { data: existing, error: selErr } = await sb
      .from("patients")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 400 });

    if (!existing) {
      const first = body.first_name ?? (user.user_metadata?.first_name ?? null);
      const last  = body.last_name  ?? (user.user_metadata?.last_name ?? null);
      const full  = (first || last) ? `${first ?? ""} ${last ?? ""}`.trim() : (user.user_metadata?.full_name ?? null);
      const email = user.email ?? null;

      const { error: insErr } = await sb.from("patients").insert({
        user_id: user.id,
        email,
        first_name: first,
        last_name: last,
        full_name: full,
        phone_number: body.phone_number ?? null,
      });
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    const { data: patient, error: getErr } = await sb
      .from("patients")
      .select("user_id, full_name, first_name, last_name, email, phone_number, created_at")
      .eq("user_id", user.id)
      .single();
    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 400 });

    return NextResponse.json({ user, patient }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
