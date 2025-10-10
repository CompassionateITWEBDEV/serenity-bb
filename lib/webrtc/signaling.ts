// @/lib/webrtc/signaling.ts
import { supabase } from "@/lib/supabase/client";

/**
 * Shared per-user channel for call signaling.
 * Broadcast events:
 *  - "ring"           -> incoming call banner
 *  - "hangup"         -> end call
 *  - "webrtc-offer"   -> SDP offer
 *  - "webrtc-answer"  -> SDP answer
 *  - "webrtc-ice"     -> ICE candidates
 */
export function userRingChannel(userId: string) {
  return supabase.channel(`webrtc_user_${userId}`, {
    config: { broadcast: { ack: true } },
  });
}

export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName?: string; mode: "audio" | "video" }
) {
  return supabase.channel(`webrtc_user_${toUserId}`).send({
    type: "broadcast",
    event: "ring",
    payload,
  });
}

export async function sendHangupToUser(toUserId: string, conversationId?: string) {
  return supabase.channel(`webrtc_user_${toUserId}`).send({
    type: "broadcast",
    event: "hangup",
    payload: { conversationId },
  });
}

export async function sendOfferToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return supabase.channel(`webrtc_user_${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-offer",
    payload,
  });
}

export async function sendAnswerToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return supabase.channel(`webrtc_user_${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-answer",
    payload,
  });
}

export async function sendIceToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
) {
  return supabase.channel(`webrtc_user_${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-ice",
    payload,
  });
}
