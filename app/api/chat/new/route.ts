import { NextResponse } from "next/server";
import { supabaseAdmin, getBearerToken } from "@/lib/supabase/server";

type StaffRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
  role: string | null;
  avatar_url: string | null;
  active: boolean | null;
};

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
    }

    // Validate caller
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const uid = userRes.user.id;

    // Parse input
    const body = await req.json().catch(() => ({}));
    const providerId: string | undefined = body?.providerId;
    if (!providerId) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }
    if (providerId === uid) {
      return NextResponse.json({ error: "Cannot start a chat with yourself" }, { status: 400 });
    }

    // Caller must be a patient
    const { data: patient, error: patErr } = await supabaseAdmin
      .from("patients")
      .select("user_id, first_name, last_name, email")
      .eq("user_id", uid)
      .maybeSingle();
    if (patErr) {
      return NextResponse.json({ error: patErr.message }, { status: 500 });
    }
    if (!patient) {
      return NextResponse.json({ error: "Only patients can start a chat" }, { status: 403 });
    }

    // Provider must be an active staff
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select(
        "user_id, first_name, last_name, email, role, avatar_url, active"
      )
      .eq("user_id", providerId)
      .maybeSingle<StaffRow>();
    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }
    if (!staff || !staff.active) {
      return NextResponse.json({ error: "Provider not found or inactive" }, { status: 404 });
    }

    // Prefill provider fields (avoids extra client update)
    const provider_name =
      [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email || "Staff";
    const provider_role = (() => {
      const r = (staff.role ?? "").toLowerCase();
      if (r.includes("doc")) return "doctor";
      if (r.includes("nurse")) return "nurse";
      if (r.includes("counsel")) return "counselor";
      return "nurse";
    })();
    const provider_avatar = staff.avatar_url ?? null;

    // Upsert conversation by unique (patient_id, provider_id)
    const { data: upserted, error: upsertErr } = await supabaseAdmin
      .from("conversations")
      .upsert(
        {
          patient_id: uid,
          provider_id: providerId,
          provider_name,
          provider_role,
          provider_avatar,
          last_message: null,
          last_message_at: null,
        },
        { onConflict: "patient_id,provider_id" }
      )
      .select(
        "id, patient_id, provider_id, provider_name, provider_role, provider_avatar, last_message, last_message_at, created_at"
      )
      .single();
    if (upsertErr) {
      // 23505 would indicate unique violation; fallback to select
      const { data: existing, error: selErr } = await supabaseAdmin
        .from("conversations")
        .select(
          "id, patient_id, provider_id, provider_name, provider_role, provider_avatar, last_message, last_message_at, created_at"
        )
        .eq("patient_id", uid)
        .eq("provider_id", providerId)
        .maybeSingle();
      if (selErr || !existing) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
      return NextResponse.json({ conversation: existing }, { status: 200 });
    }

    return NextResponse.json({ conversation: upserted }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
