import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseFromRoute() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => store.get(n)?.value,
        set: (name: string, value: string, opts: any) => store.set({ name, value, ...opts }),
        remove: (name: string, opts: any) => store.delete({ name, ...opts }),
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = supabaseFromRoute();

  const { data: au, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const me = au.user;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { providerId?: string; patientId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Caller can be patient (provides providerId) or staff (provides patientId)
  let patientId: string | undefined;
  let providerId: string | undefined;

  if (body.providerId) {
    // patient starting a chat
    patientId = me.id;
    providerId = body.providerId;
  } else if (body.patientId) {
    // staff starting a chat
    patientId = body.patientId;
    providerId = me.id;
  } else {
    return NextResponse.json({ error: "providerId or patientId is required" }, { status: 400 });
  }

  const { data: convId, error: fnErr } = await supabase.rpc("ensure_conversation", {
    p_patient: patientId,
    p_provider: providerId,
  });
  if (fnErr || !convId) {
    return NextResponse.json({ error: fnErr?.message || "ensure_conversation failed" }, { status: 400 });
  }

  // Return full row used by UI
  const { data: conv, error: selErr } = await supabase
    .from("conversations")
    .select(
      "id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at"
    )
    .eq("id", convId as string)
    .single();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 400 });

  return NextResponse.json({ conversation: conv });
}
