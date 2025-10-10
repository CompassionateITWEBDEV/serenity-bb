// @/lib/webrtc/signaling.ts
import { supabase } from "@/lib/supabase/client";

/**
 * One shared user channel for **all** signaling messages related to calls.
 * We'll use broadcast events:
 * - "ring"                 -> incoming call banner
 * - "hangup"               -> end call
 * - "webrtc-offer"         -> caller -> callee
 * - "webrtc-answer"        -> callee -> caller
 * - "webrtc-ice"           -> both directions (trickle ICE)
 *
 * Every payload must include { conversationId, fromId, ... } so the receiver
 * can route it to the correct dialog.
 */
export function userRingChannel(userId: string) {
  return supabase.channel(`webrtc_user_${userId}`, {
    config: { broadcast: { ack: true } },
  });
}

/** RING / HANGUP */

export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName?: string; mode: "audio" | "video" }
) {
  return supabase
    .channel(`webrtc_user_${toUserId}`)
    .send({
      type: "broadcast",
      event: "ring",
      payload,
    });
}

export async function sendHangupToUser(toUserId: string, conversationId?: string) {
  return supabase
    .channel(`webrtc_user_${toUserId}`)
    .send({
      type: "broadcast",
      event: "hangup",
      payload: { conversationId },
    });
}

/** SDP & ICE */

export async function sendOfferToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return supabase
    .channel(`webrtc_user_${toUserId}`)
    .send({ type: "broadcast", event: "webrtc-offer", payload });
}

export async function sendAnswerToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return supabase
    .channel(`webrtc_user_${toUserId}`)
    .send({ type: "broadcast", event: "webrtc-answer", payload });
}

export async function sendIceToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
) {
  return supabase
    .channel(`webrtc_user_${toUserId}`)
    .send({ type: "broadcast", event: "webrtc-ice", payload });
}
