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
  const user = au.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { conversationId, content } = await req.json();
  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Pull convo to get patient_id & provider_id
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, patient_id, provider_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr || !conv) return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  if (![conv.patient_id, conv.provider_id].includes(user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Who am I? (patient vs staff)
  const { data: isPatient } = await supabase.from("patients").select("user_id").eq("user_id", user.id).maybeSingle();
  const { data: staff } = await supabase.from("staff").select("role, department").eq("user_id", user.id).maybeSingle();

  const sender_role = isPatient
    ? "patient"
    : ((staff?.role ?? staff?.department ?? "").toString().toLowerCase().includes("counsel") ? "counselor"
      : (staff?.role ?? staff?.department ?? "").toString().toLowerCase().includes("doc") ? "doctor"
      : "nurse");

  const sender_name = (user.user_metadata?.full_name as string) || user.email || "User";

  // Insert message
  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      patient_id: conv.patient_id,
      sender_id: user.id,
      sender_name,
      sender_role,
      content: String(content).trim(),
      read: false
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update conversation snapshot fields to drive staff list & realtime UPDATE
  await supabase
    .from("conversations")
    .update({
      last_message: msg.content,
      last_message_at: msg.created_at
    })
    .eq("id", conversationId);

  return NextResponse.json({ message: msg });
}
