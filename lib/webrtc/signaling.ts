// File: lib/webrtc/signaling.ts
import { supabase } from "@/lib/supabase/client";

export type CallMode = "audio" | "video";

/** Shared ICE servers */
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  ],
};

/** Per-user “ring” channel */
export function userRingChannel(userId: string) {
  return supabase.channel(`user:${userId}`, { config: { presence: { key: userId } } });
}

/** Per-conversation signaling channel (SDP/ICE/hangup) */
export function conversationChannel(conversationId: string) {
  return supabase.channel(`conv:${conversationId}`);
}

/** Ensure subscribed before sending */
export async function ensureSubscribed(ch: ReturnType<typeof supabase.channel>) {
  const status = await ch.subscribe();
  if (status !== "SUBSCRIBED") throw new Error("Signaling not ready");
  return ch;
}

/** Send a ring to a specific user */
export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName: string; mode: CallMode }
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  await ch.send({ type: "broadcast", event: "ring", payload });
}

/** Clear incoming banner on the callee side */
export async function sendHangupToUser(toUserId: string, conversationId: string) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  await ch.send({ type: "broadcast", event: "hangup", payload: { conversationId } });
}

/** (Optional) announce hangup on conversation channel */
export async function sendHangupToConversation(conversationId: string) {
  const ch = conversationChannel(conversationId);
  await ensureSubscribed(ch);
  await ch.send({ type: "broadcast", event: "hangup", payload: {} });
}
