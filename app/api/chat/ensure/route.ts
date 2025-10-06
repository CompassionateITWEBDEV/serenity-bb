import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function srv() {
  // server client via cookies-less mode (route handlers)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get() {}, set() {}, remove() {} } }
  );
}

export async function POST(req: Request) {
  const supabase = srv();
  const { data: au } = await supabase.auth.getUser();
  if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { patientId, providerId, providerName, providerRole, providerAvatar } = await req.json();
  if (!patientId || !providerId || !providerName || !providerRole) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (existing?.id) return NextResponse.json({ id: existing.id });

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      patient_id: patientId,
      provider_id: providerId,
      provider_name: providerName,
      provider_role: providerRole,
      provider_avatar: providerAvatar ?? null
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
