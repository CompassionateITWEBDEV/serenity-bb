import { supabase } from "@/lib/supabase/client";

// ------------------ Types ------------------
export type SignalPayload =
  | {
      type: "webrtc-offer";
      conversationId: string;
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "webrtc-answer";
      conversationId: string;
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "webrtc-ice";
      conversationId: string;
      fromId: string;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: "hangup";
      conversationId: string;
      fromId: string;
    };

// ------------------ Channel ------------------
/**
 * Create a dedicated signaling channel per user.
 * Used for listening to WebRTC offers, answers, ICE candidates, and call control events.
 */
export function userRingChannel(userId: string) {
  return supabase.channel(`webrtc:${userId}`, {
    config: { broadcast: { self: false } }, // Prevent self-echo
  });
}

// ------------------ Offer/Answer/ICE/Hangup ------------------
export async function sendOfferToUser(
  toUserId: string,
  p: Extract<SignalPayload, { type: "webrtc-offer" }>
) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-offer",
    payload: p,
  });
}

export async function sendAnswerToUser(
  toUserId: string,
  p: Extract<SignalPayload, { type: "webrtc-answer" }>
) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-answer",
    payload: p,
  });
}

export async function sendIceToUser(
  toUserId: string,
  p: Extract<SignalPayload, { type: "webrtc-ice" }>
) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-ice",
    payload: p,
  });
}

export async function sendHangupToUser(
  toUserId: string,
  conversationId: string,
  fromId?: string
) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "hangup",
    payload: {
      type: "hangup",
      conversationId,
      fromId: fromId ?? "system",
    },
  });
}

// ------------------ Ring (NEW) ------------------
/**
 * Notifies the peer that a call is incoming.
 * @param toUserId - The receiver’s Supabase user ID
 * @param payload - Basic call metadata (conversationId, caller, mode)
 */
export async function sendRing(
  toUserId: string,
  payload: {
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: "audio" | "video";
  }
) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "ring",
    payload,
  });
}

// ------------------ Ensure Subscribed ------------------
/**
 * Ensures a Realtime channel is fully subscribed before sending signals.
 */
export function ensureSubscribed(
  channel: ReturnType<typeof userRingChannel>
): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    channel.subscribe((status: string) => {
      if (!done && status === "SUBSCRIBED") {
        done = true;
        resolve();
      }
    });
  });
}
