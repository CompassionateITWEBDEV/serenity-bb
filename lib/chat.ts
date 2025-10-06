import { supabase } from "@/lib/supabase/client";

export type ProviderRole = "doctor" | "nurse" | "counselor";

export type ConversationPreview = {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  patient_avatar: string | null;
  last_message: string | null;
  updated_at: string; // derived: coalesce(last_message_at, created_at)
};

export async function ensureConversation(
  patientId: string,
  provider: { id: string; name: string; role: ProviderRole; avatar?: string | null }
): Promise<{ id: string }> {
  const { data: existing, error: exErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (exErr) throw exErr;
  if (existing?.id) return { id: existing.id };

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      patient_id: patientId,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_role: provider.role,
      provider_avatar: provider.avatar ?? null
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

export async function listConversationsForProvider(
  providerId: string
): Promise<ConversationPreview[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id,
      patient_id,
      provider_id,
      last_message,
      last_message_at,
      created_at,
      patients!conversations_patient_id_fkey(full_name, email, avatar)
    `)
    .eq("provider_id", providerId);

  if (error) throw error;

  return (data as any[]).map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    patient_name: r.patients?.full_name ?? null,
    patient_email: r.patients?.email ?? null,
    patient_avatar: r.patients?.avatar ?? null,
    last_message: r.last_message ?? null,
    updated_at: (r.last_message_at ?? r.created_at) as string
  }))
  .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export async function markRead(conversationId: string, viewer: "patient" | "provider") {
  // Provider reading => mark unread patient messages as read. Vice versa for patient.
  const sender_role = viewer === "provider" ? "patient" : "doctor"; // staff may be nurse/doctor/counselor
  // mark anything not sent by viewer as read
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", (await supabase.auth.getUser()).data.user?.id ?? "00000000-0000-0000-0000-000000000000");

  if (error) throw error;
}
