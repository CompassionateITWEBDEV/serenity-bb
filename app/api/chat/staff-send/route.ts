import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

type EnsureConversationParams = { p_patient: string; p_provider: string };

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = supabaseFromRoute();
  const { data: au, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const me = au.user;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { content?: unknown; patientId?: string; conversationId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "empty" }, { status: 400 });

  let conversationId = body.conversationId ?? "";
  if (!conversationId) {
    const patientId = String(body?.patientId ?? "");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    const { data: convId, error: fnErr } = await supabase.rpc(
      "ensure_conversation",
      { p_patient: patientId, p_provider: me.id } as EnsureConversationParams
    );
    if (fnErr || !convId)
      return NextResponse.json({ error: fnErr?.message || "ensure failed" }, { status: 400 });
    conversationId = convId as unknown as string;
  }

  // Get staff info for proper sender name and role (same as patient messages)
  const { data: staff } = await supabase
    .from("staff")
    .select("first_name, last_name, role, department")
    .eq("user_id", me.id)
    .maybeSingle();

  const sender_name = staff 
    ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || me.email || "Staff"
    : (me.user_metadata?.full_name as string) || me.email || "Staff";

  // Determine sender role (same logic as /api/chat/send)
  const role = (staff?.role ?? staff?.department ?? "").toString().toLowerCase();
  const sender_role = role.includes("doc") ? "doctor" 
    : role.includes("counsel") ? "counselor" 
    : "nurse";

  // Get patient_id from conversation if not provided
  let patientId = body.patientId;
  if (!patientId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("patient_id")
      .eq("id", conversationId)
      .single();
    patientId = conv?.patient_id;
  }

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      patient_id: patientId,
      sender_id: me.id,
      sender_name,
      sender_role,
      content,
      read: false,
      urgent: false,
    })
    .select("*")
    .single();
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  // Update conversation (same as patient messages)
  await supabase
    .from("conversations")
    .update({ last_message: msg.content, last_message_at: msg.created_at })
    .eq("id", conversationId);

  return NextResponse.json({ conversationId, message: msg });
}
