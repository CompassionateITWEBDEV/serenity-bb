import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSupabase, supabaseRealtimeForToken } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConversationRow = { id: string; patient_id: string; provider_id: string | null };

function writeSSE(w: WritableStreamDefaultWriter<Uint8Array>, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return w.write(new TextEncoder().encode(payload));
}

export async function GET(req: NextRequest) {
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  // Auth via Supabase cookies
  const supabase = getServerSupabase();
  const { data: s } = await supabase.auth.getSession();
  const session = s.session;
  if (!session?.access_token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authorization: caller must be patient or provider of this conversation
  const { data: convo, error } = await supabase
    .from("conversations")
    .select("id, patient_id, provider_id")
    .eq("id", conversationId)
    .maybeSingle<ConversationRow>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const uid = session.user.id;
  if (convo.patient_id !== uid && convo.provider_id !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Start SSE stream
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Realtime with caller's JWT → RLS enforced
  const rt = supabaseRealtimeForToken(session.access_token);
  const channel = rt
    .channel(`conv_${conversationId}`)
    .on(
      "postgres_changes",
      {
        schema: "public",
        table: "messages",
        event: "*",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        void writeSSE(writer, "change", {
          type: payload.eventType,
          new: payload.new ?? null,
          old: payload.old ?? null,
        });
      }
    )
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await writeSSE(writer, "open", { ok: true, conversationId });
    });

  const hb = setInterval(() => {
    void writer.write(new TextEncoder().encode("event: ping\ndata: \"💓\"\n\n"));
  }, 15000);

  req.signal.addEventListener("abort", async () => {
    try {
      clearInterval(hb);
      await writeSSE(writer, "close", { ok: true });
      await rt.removeChannel(channel);
      await writer.close();
    } catch {
      /* noop */
    }
  });

  return new NextResponse(stream.readable, { headers });
}
