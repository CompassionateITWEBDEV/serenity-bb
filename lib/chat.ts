import { supabase } from "@/lib/supabase-browser";

export type ProviderRole = "doctor" | "nurse" | "counselor";

export type Conversation = {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  patient_avatar: string | null;
  last_message: string | null;
  updated_at: string; // last_message_at || created_at
};

export type MessageRow = {
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

/** Conversations visible to the provider (real DB, no mocks). */
export async function listConversationsForProvider(providerId: string): Promise<Conversation[]> {
  const q = await supabase
    .from("conversations")
    .select(
      "id, patient_id, provider_id, provider_name, provider_role, provider_avatar, last_message, last_message_at, created_at, patients:patient_id(full_name, email, avatar)"
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (q.error) throw q.error;

  const rows = (q.data ?? []) as any[];
  return rows
    .map((r) => ({
      id: r.id as string,
      patient_id: r.patient_id as string,
      patient_name: (r.patients?.full_name as string | null) ?? null,
      patient_email: (r.patients?.email as string | null) ?? null,
      patient_avatar: (r.patients?.avatar as string | null) ?? null,
      last_message: (r.last_message as string | null) ?? null,
      updated_at: ((r.last_message_at as string | null) ?? (r.created_at as string)) as string,
    }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export async function ensureConversationWithPatient(
  provider: { id: string; name: string; role: ProviderRole },
  patientId: string
): Promise<string> {
  const found = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!found.error && found.data) return found.data.id as string;

  const ins = await supabase
    .from("conversations")
    .insert({
      patient_id: patientId,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_role: provider.role,
      provider_avatar: null,
      last_message: null,
      last_message_at: null,
    })
    .select("id")
    .single();

  if (ins.error) throw ins.error;
  return ins.data.id as string;
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function sendMessage(input: {
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | ProviderRole;
  content: string;
}) {
  const { error } = await supabase.from("messages").insert({
    ...input,
    read: input.sender_role !== "patient", // provider messages are read by provider
    urgent: false,
  });
  if (error) throw error;

  // best-effort parent update; DB trigger may already do this
  await supabase
    .from("conversations")
    .update({ last_message: input.content, last_message_at: new Date().toISOString() })
    .eq("id", input.conversation_id);
}

export async function markRead(conversationId: string, viewerRole: "patient" | ProviderRole) {
  const senderRoleToAck = viewerRole === "patient" ? ["doctor", "nurse", "counselor"] : ["patient"];
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .in("sender_role", senderRoleToAck)
    .eq("read", false);
  if (error) throw error;
}

/** Inbox stream: emits new messages from patients (for unread). */
export function subscribeInbox(providerId: string, onInsert: (m: MessageRow) => void) {
  const ch = supabase
    .channel(`inbox_${providerId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const m = payload.new as MessageRow;
        if (m.sender_role === "patient") onInsert(m);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/** Per-thread stream for a conversation. */
export function subscribeThread(conversationId: string, onInsert: (m: MessageRow) => void, onUpdate?: () => void) {
  const ch = supabase
    .channel(`thread_${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as MessageRow)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      () => onUpdate?.()
    )
    .subscribe();
  return () => supabase.removeChannel(ch);
}
