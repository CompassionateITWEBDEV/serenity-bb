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
    }
  | {
      type: "ring";
      conversationId: string;
      fromId: string;
      fromName: string;
      mode: "audio" | "video";
    };

// ------------------ Channel Cache ------------------
/**
 * Keep one active Supabase channel per user to prevent duplicate subscriptions.
 */
const channelCache = new Map<string, ReturnType<typeof supabase.channel>>();

export function userRingChannel(userId: string) {
  if (!userId) throw new Error("userId is required for userRingChannel");

  if (channelCache.has(userId)) {
    return channelCache.get(userId)!;
  }

  const ch = supabase.channel(`webrtc:${userId}`, {
    config: { broadcast: { self: false } },
  });

  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.debug(`[RTC] Channel subscribed for user ${userId}`);
    } else {
      console.debug(`[RTC] Channel status for ${userId}: ${status}`);
    }
  });

  channelCache.set(userId, ch);
  return ch;
}

// ------------------ Helper: ensure channel ready ------------------
async function ensureSubscribed(channel: ReturnType<typeof supabase.channel>) {
  return new Promise<void>((resolve) => {
    if ((channel as any).state === "joined") return resolve();
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
}

// ------------------ Send helpers ------------------
export async function sendOfferToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-offer" }>
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending offer →", toUserId);
  await ch.send({ type: "broadcast", event: "webrtc-offer", payload });
}

export async function sendAnswerToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-answer" }>
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending answer →", toUserId);
  await ch.send({ type: "broadcast", event: "webrtc-answer", payload });
}

export async function sendIceToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-ice" }>
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending ICE candidate →", toUserId);
  await ch.send({ type: "broadcast", event: "webrtc-ice", payload });
}

export async function sendHangupToUser(
  toUserId: string,
  conversationId: string,
  fromId?: string
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending hangup →", toUserId);
  await ch.send({
    type: "broadcast",
    event: "hangup",
    payload: { type: "hangup", conversationId, fromId: fromId ?? "system" },
  });
}

export async function sendRing(
  toUserId: string,
  payload: {
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: "audio" | "video";
  }
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending ring →", toUserId);
  await ch.send({ type: "broadcast", event: "ring", payload });
}

// ------------------ Debug Utility ------------------
/**
 * Listen to all events for debugging connectivity.
 * Use only during development.
 */
export function attachDebugListener(userId: string) {
  const ch = userRingChannel(userId);
  ch.on("broadcast", { event: "*" }, (msg) =>
    console.log("[RTC DEBUG]", msg.event, msg.payload)
  );
}
