import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

type EnsureConversationParams = { p_patient: string; p_provider: string };

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

  // Either use provided conversationId or ensure one from patientId
  let conversationId = body.conversationId;
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

  const sender_name =
    (me.user_metadata?.full_name as string | undefined) ?? me.email ?? "Staff";

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me.id,
      sender_name,
      sender_role: "staff",
      content,
      read: false,
    })
    .select("*")
    .single();
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  await supabase
    .from("conversations")
    .update({ last_message: msg.content, last_message_at: msg.created_at })
    .eq("id", conversationId);

  return NextResponse.json({ conversationId, message: msg });
}
