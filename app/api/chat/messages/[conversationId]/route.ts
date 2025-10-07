import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const supabase = supabaseFromRoute();
  const { data: au } = await supabase.auth.getUser();
  if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const before = url.searchParams.get("before"); // ISO timestamp for pagination

  let q = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ messages: data?.reverse() ?? [] });
}

// /app/api/chat/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  const supabase = supabaseFromRoute();
  const { data: au } = await supabase.auth.getUser();
  if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = au.user;

  const { conversationId } = (await req.json()) as { conversationId?: string };
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  // Mark messages not sent by me as read
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", me.id)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
