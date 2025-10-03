"use client";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type Conversation = {
  id: string;
  patient_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: "doctor" | "nurse" | "counselor";
  last_message: string | null;
  last_message_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | "doctor" | "nurse" | "counselor";
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

function err(e?: PostgrestError | null) {
  if (e) throw new Error(e.message);
}

export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  err(error);
  return data.user; // null if not signed in
}

/** Ensures a conversation exists, returns it. Caller must be one party. */
export async function ensureConversation(patientId: string, provider: { id: string; name: string; role: "doctor" | "nurse" | "counselor" }) {
  // Try find
  let { data: convo, error: findErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("patient_id", patientId)
    .eq("provider_id", provider.id)
    .maybeSingle<Conversation>();
  err(findErr);
  if (convo) return convo;

  // Create
  const { data: created, error: insErr } = await supabase
    .from("conversations")
    .insert({
      patient_id: patientId,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_role: provider.role,
    })
    .select()
    .single<Conversation>();
  err(insErr);
  return created!;
}

export async function listMessages(conversationId: string, limit = 100) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit) as any as { data: Message[]; error: PostgrestError | null };
  err(error);
  return data!;
}

export async function sendMessage(input: {
  conversationId: string;
  patientId: string;
  senderId: string;
  senderName: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  content: string;
}) {
  const { data: m, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      patient_id: input.patientId,
      sender_id: input.senderId,
      sender_name: input.senderName,
      sender_role: input.senderRole,
      content: input.content.trim(),
    })
    .select()
    .single<Message>();
  err(error);

  // mirror last_message (you can replace with a DB trigger later)
  await supabase
    .from("conversations")
    .update({ last_message: m.content, last_message_at: m.created_at })
    .eq("id", input.conversationId);

  return m;
}
