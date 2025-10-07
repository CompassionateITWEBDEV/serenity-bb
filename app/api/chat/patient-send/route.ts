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

  let content = "";
  try {
    const body = (await req.json()) as { content?: unknown };
    content = String(body?.content ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!content) return NextResponse.json({ error: "empty" }, { status: 400 });

  const { data: rel, error: relErr } = await supabase
    .from("patient_care_team")
    .select("staff_id, is_primary")
    .eq("patient_id", me.id)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 400 });
  if (!rel?.staff_id) return NextResponse.json({ error: "no assigned staff" }, { status: 400 });

  const { data: convId, error: fnErr } = await supabase.rpc(
    "ensure_conversation",
    { p_patient: me.id, p_provider: rel.staff_id } as EnsureConversationParams
  );
  if (fnErr || !convId) return NextResponse.json({ error: fnErr?.message || "ensure failed" }, { status: 400 });

  const sender_name =
    (me.user_metadata?.full_name as string | undefined) ?? me.email ?? "Patient";

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId as unknown as string,
      patient_id: me.id,
      sender_id: me.id,
      sender_name,
      sender_role: "patient",
      content,
      read: false,
    })
    .select("*")
    .single();
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  await supabase
    .from("conversations")
    .update({ last_message: msg.content, last_message_at: msg.created_at })
    .eq("id", convId as unknown as string);

  return NextResponse.json({ conversationId: convId, message: msg });
}
