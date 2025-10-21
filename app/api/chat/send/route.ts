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

  const { conversationId, content, sessionId, messageType = "text", metadata = {} } = await req.json();
  if (!conversationId || !content?.trim())
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data: conv, error: convErr } = await supabase
    .from("conversations").select("id, patient_id, provider_id").eq("id", conversationId).maybeSingle();
  if (convErr || !conv) return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  if (![conv.patient_id, conv.provider_id].includes(me.id))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: staff } = await supabase.from("staff").select("role, department").eq("user_id", me.id).maybeSingle();
  const role = (staff?.role ?? staff?.department ?? "").toString().toLowerCase();
  const sender_role = role.includes("doc") ? "doctor" : role.includes("counsel") ? "counselor" : "nurse";
  const sender_name = (me.user_metadata?.full_name as string) || me.email || "Staff";

  const messageData = {
    conversation_id: conversationId,
    patient_id: conv.patient_id,
    sender_id: me.id,
    sender_name,
    sender_role,
    content: String(content).trim(),
    read: false,
    ...(sessionId && { metadata: { ...metadata, session_id: sessionId, message_type: messageType } })
  };

  const { data: msg, error } = await supabase
    .from("messages")
    .insert(messageData)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("conversations")
    .update({ last_message: msg.content, last_message_at: msg.created_at })
    .eq("id", conversationId);

  return NextResponse.json({ message: msg });
}
