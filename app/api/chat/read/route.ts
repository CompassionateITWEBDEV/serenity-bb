import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  const supabase = supabaseFromRoute();
  const { data: au } = await supabase.auth.getUser();
  if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = au.user;

  const { conversationId } = (await req.json()) as { conversationId?: string };
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", me.id)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
