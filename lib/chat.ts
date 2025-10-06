// FILE: lib/chat.ts
// Purpose: Single source of chat helpers used by ChatBox and Staff Messages.
// IMPORTANT: matches your imports in components/chat/ChatBox.tsx
// Uses the browser Supabase client.
import { supabase } from "@/lib/supabase/client";

export type ProviderRole = "doctor" | "nurse" | "counselor";

/** Row shape from public.messages */
export type Message = {
  id: string;
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | ProviderRole;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

/** Minimal supabase auth user (or null if not signed in). */
export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/**
 * Ensure a conversation exists for (patient_id, provider_id).
 * Returns { id } of the conversation.
 * Why: Staff/Patient UIs may call this before opening ChatBox.
 */
export async function ensureConversation(
  patientId: string,
  provider: { id: string; name: string; role: ProviderRole; avatarUrl?: string | null }
): Promise<{ id: string }> {
  // find
  const found = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!found.error && found.data) return { id: found.data.id as string };

  // create (your schema has no `title` column)
  const ins = await supabase
    .from("conversations")
    .insert({
      patient_id: patientId,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_role: provider.role,
      provider_avatar: provider.avatarUrl ?? null,
      last_message: null,
      last_message_at: null,
    })
    .select("id")
    .single();

  if (ins.error) throw ins.error;
  return { id: ins.data.id as string };
}

/** List all messages in a conversation (ascending). */
export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

/** Insert a message and update conversation preview. */
export async function sendMessage(input: {
  conversationId: string;
  patientId: string;
  senderId: string;
  senderName: string;
  senderRole: "patient" | ProviderRole;
  content: string;
}) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    patient_id: input.patientId,
    sender_id: input.senderId,
    sender_name: input.senderName,
    sender_role: input.senderRole,
    content: input.content,
    read: input.senderRole !== "patient",
    urgent: false,
  });
  if (error) throw error;

  // best-effort preview update (safe if you also have a trigger)
  await supabase
    .from("conversations")
    .update({ last_message: input.content, last_message_at: new Date().toISOString() })
    .eq("id", input.conversationId);
}

/** Staff list: conversations where provider_id = me (newest first). */
export async function listConversationsForProvider(providerId: string) {
  const q = await supabase
    .from("conversations")
    .select(
      "id, patient_id, provider_id, provider_name, provider_role, provider_avatar, last_message, last_message_at, created_at, patients:patient_id(full_name, email, avatar)"
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (q.error) throw q.error;

  return (q.data ?? []).map((r: any) => ({
    id: r.id as string,
    patient_id: r.patient_id as string,
    patient_name: (r.patients?.full_name as string | null) ?? null,
    patient_email: (r.patients?.email as string | null) ?? null,
    patient_avatar: (r.patients?.avatar as string | null) ?? null,
    last_message: (r.last_message as string | null) ?? null,
    updated_at: ((r.last_message_at as string | null) ?? (r.created_at as string)) as string,
  }));
}

/** Mark messages as read from the viewer perspective (optional helper). */
export async function markRead(conversationId: string, viewerRole: "patient" | ProviderRole) {
  const ack = viewerRole === "patient" ? ["doctor", "nurse", "counselor"] : ["patient"];
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .in("sender_role", ack)
    .eq("read", false);
}
