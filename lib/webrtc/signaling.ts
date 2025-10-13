import { supabase } from "@/lib/supabase/client";

export type OfferPayload = {
  conversationId: string;
  fromId: string;
  sdp: RTCSessionDescriptionInit;
};
export type AnswerPayload = {
  conversationId: string;
  fromId: string;
  sdp: RTCSessionDescriptionInit;
};
export type IcePayload = {
  conversationId: string;
  fromId: string;
  candidate: RTCIceCandidateInit;
};
export type HangupPayload = {
  conversationId: string;
  fromId?: string;
};

export function userRingChannel(userId: string) {
  return supabase.channel(`webrtc:${userId}`, {
    config: { broadcast: { self: false } },
  });
}

export async function sendOfferToUser(toUserId: string, p: OfferPayload) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-offer",
    payload: p,
  });
}

export async function sendAnswerToUser(toUserId: string, p: AnswerPayload) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-answer",
    payload: p,
  });
}

export async function sendIceToUser(toUserId: string, p: IcePayload) {
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
  const payload: HangupPayload = { conversationId, fromId: fromId ?? "system" };
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "hangup",
    payload,
  });
}

/** Optional helper to await SUBSCRIBED if you need it elsewhere */
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
