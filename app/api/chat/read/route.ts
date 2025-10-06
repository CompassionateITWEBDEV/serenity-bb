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

  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
