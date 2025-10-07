import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function supabaseFromRoute() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // why: bind Supabase auth to Next.js request/response cookies
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}

type EnsureConversationParams = {
  p_patient: string;
  p_provider: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();

    const { data: au, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const me = au.user;
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const content = String((body as { content?: unknown })?.content ?? "").trim();
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
    if (fnErr || !convId)
      return NextResponse.json({ error: fnErr?.message || "cannot ensure conversation" }, { status: 400 });

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
    if (msgErr || !msg) return NextResponse.json({ error: msgErr?.message || "failed to send" }, { status: 400 });

    await supabase
      .from("conversations")
      .update({ last_message: msg.content, last_message_at: msg.created_at })
      .eq("id", convId as unknown as string);

    return NextResponse.json({ conversationId: convId, message: msg });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
