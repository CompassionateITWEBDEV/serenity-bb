import { supabase } from "@/lib/supabase/client";

export type ProviderRole = "doctor" | "nurse" | "counselor";

export type ConversationPreview = {
  id: string;
  patient_id: string;
  provider_id: string;
  patient_name: string | null;
  patient_email: string | null;
  patient_avatar: string | null;
  last_message: string | null;
  updated_at: string;
};

export async function listConversationsForProvider(providerId: string): Promise<ConversationPreview[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id, patient_id, provider_id, last_message, last_message_at, created_at,
      patients!conversations_patient_id_fkey(full_name, email, avatar)
    `)
    .eq("provider_id", providerId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    patient_id: r.patient_id,
    provider_id: r.provider_id,
    patient_name: r.patients?.full_name ?? null,
    patient_email: r.patients?.email ?? null,
    patient_avatar: r.patients?.avatar ?? null,
    last_message: r.last_message,
    updated_at: r.last_message_at ?? r.created_at,
  }));
}

/** Ensures a provider↔patient conversation exists. */
export async function ensureConversation(
  patientId: string,
  provider: { id: string; name: string; role: ProviderRole; avatar?: string | null }
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      {
        patient_id: patientId,
        provider_id: provider.id,
        provider_name: provider.name,
        provider_role: provider.role,
        provider_avatar: provider.avatar ?? null,
      },
      { onConflict: "patient_id,provider_id" }
    )
    .select("id")
    .single();

  if (error) {
    const { data: existing, error: selErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("patient_id", patientId)
      .eq("provider_id", provider.id)
      .maybeSingle();
    if (selErr || !existing) throw error;
    return { id: existing.id };
  }
  return { id: data!.id };
}

/** Marks opposite-party messages as read. */
export async function markRead(conversationId: string, viewerRole: "patient" | ProviderRole) {
  const opposite = viewerRole === "patient" ? ["doctor", "nurse", "counselor"] : ["patient"];
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .in("sender_role", opposite)
    .eq("read", false);
  if (error) throw error;
}
