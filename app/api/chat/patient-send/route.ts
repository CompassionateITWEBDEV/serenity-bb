import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function srv() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get() {}, set() {}, remove() {} } }
  );
}

export async function POST(req: Request) {
  const supabase = srv();
  const { data: au } = await supabase.auth.getUser();
  const me = au.user;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  // Find my primary staff (fallback: first care-team member)
  const { data: rel } = await supabase
    .from("patient_care_team")
    .select("staff_id, is_primary")
    .eq("patient_id", me.id)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rel?.staff_id)
    return NextResponse.json({ error: "no assigned staff" }, { status: 400 });

  // Ensure conversation (server-side function bypasses race)
  const { data: convRow, error: fnErr } = await supabase
    .rpc("ensure_conversation", { p_patient: me.id, p_provider: rel.staff_id });
  if (fnErr) return NextResponse.json({ error: fnErr.message }, { status: 400 });

  const convId = (convRow as any) ?? convRow;

  // Insert message from patient
  const sender_name = (me.user_metadata?.full_name as string) || me.email || "Patient";
  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId,
      patient_id: me.id,
      sender_id: me.id,
      sender_name,
      sender_role: "patient",
      content: String(content).trim(),
      read: false
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update snapshot on conversation
  await supabase
    .from("conversations")
    .update({ last_message: msg.content, last_message_at: msg.created_at })
    .eq("id", convId);

  return NextResponse.json({ conversationId: convId, message: msg });
}
