import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function supabaseFromRoute(req: NextRequest) {
  const store = cookies();
  const authHeader = req.headers.get("authorization") || ""; // Bearer fallback

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // needed for refresh on server mutations
          store.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          store.delete({ name, ...options });
        },
      },
      // Accept Bearer token when cookies aren't forwarded
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = supabaseFromRoute(req);

  const { data: au, error: authErr } = await supabase.auth.getUser();
  if (authErr || !au.user) {
    return NextResponse.json(
      { error: authErr?.message || "Auth session missing!" },
      { status: 401 }
    );
  }

  let body: { providerId?: string; patientId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Patient starting a chat (providerId) or Staff starting a chat (patientId)
  const me = au.user;
  const patientId = body.providerId ? me.id : body.patientId;
  const providerId = body.providerId ? body.providerId : me.id;

  if (!patientId || !providerId) {
    return NextResponse.json(
      { error: "providerId or patientId is required" },
      { status: 400 }
    );
  }

  const { data: convId, error: fnErr } = await supabase.rpc("ensure_conversation", {
    p_patient: patientId,
    p_provider: providerId,
  });
  if (fnErr || !convId) {
    return NextResponse.json(
      { error: fnErr?.message || "ensure_conversation failed" },
      { status: 400 }
    );
  }

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
