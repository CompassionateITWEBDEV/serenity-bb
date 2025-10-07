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
  const before = url.searchParams.get("before"); // ISO timestamp

  let q = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ messages: (data ?? []).reverse() });
}
