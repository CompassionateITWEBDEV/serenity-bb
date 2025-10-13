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
// One channel per user id.
const channelCache = new Map<string, ReturnType<typeof supabase.channel>>();

// A single readiness promise per channel.
const channelReady = new WeakMap<
  ReturnType<typeof supabase.channel>,
  Promise<void>
>();

function makeReadyPromise(
  ch: ReturnType<typeof supabase.channel>,
  userId: string
): Promise<void> {
  // Why: resolve exactly once; avoid deadlocks from duplicate subscribe calls.
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`[RTC] Channel subscribe timeout for user ${userId}`));
    }, 10_000);

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        console.debug(`[RTC] Channel subscribed for user ${userId}`);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`[RTC] Channel error (${status}) for user ${userId}`));
      } else {
        console.debug(`[RTC] Channel status for ${userId}: ${status}`);
      }
    });
  });
}

export function userRingChannel(userId: string) {
  if (!userId) throw new Error("userId is required for userRingChannel");

  const existing = channelCache.get(userId);
  if (existing) return existing;

  const ch = supabase.channel(`webrtc:${userId}`, {
    config: { broadcast: { self: false } },
  });

  // Create and cache the readiness promise once.
  channelReady.set(ch, makeReadyPromise(ch, userId));

  channelCache.set(userId, ch);
  return ch;
}

// ------------------ Helper: ensure channel ready ------------------
async function ensureSubscribed(
  channel: ReturnType<typeof supabase.channel>
): Promise<void> {
  const ready = channelReady.get(channel);
  if (ready) {
    await ready;
    return;
  }
  // Defensive: proceed rather than re-subscribing and risking hang.
  console.warn(
    "[RTC] ensureSubscribed called on channel without ready promise; proceeding"
  );
}

// ------------------ Send helpers ------------------
export async function sendOfferToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-offer" }>
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending offer →", toUserId);
  const { status, error } = await ch.send({
    type: "broadcast",
    event: "webrtc-offer",
    payload,
  });
  if (status !== "ok") throw error ?? new Error("Failed to send offer");
}

export async function sendAnswerToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-answer" }>
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending answer →", toUserId);
  const { status, error } = await ch.send({
    type: "broadcast",
    event: "webrtc-answer",
    payload,
  });
  if (status !== "ok") throw error ?? new Error("Failed to send answer");
}

export async function sendIceToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-ice" }>
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending ICE candidate →", toUserId);
  const { status, error } = await ch.send({
    type: "broadcast",
    event: "webrtc-ice",
    payload,
  });
  if (status !== "ok") throw error ?? new Error("Failed to send ICE");
}

export async function sendHangupToUser(
  toUserId: string,
  conversationId: string,
  fromId?: string
) {
  const ch = userRingChannel(toUserId);
  await ensureSubscribed(ch);
  console.debug("[RTC] Sending hangup →", toUserId);
  const { status, error } = await ch.send({
    type: "broadcast",
    event: "hangup",
    payload: { type: "hangup", conversationId, fromId: fromId ?? "system" },
  });
  if (status !== "ok") throw error ?? new Error("Failed to send hangup");
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
  const { status, error } = await ch.send({
    type: "broadcast",
    event: "ring",
    payload,
  });
  if (status !== "ok") throw error ?? new Error("Failed to send ring");
}

// ------------------ Debug Utility ------------------
export async function attachDebugListener(userId: string) {
  const ch = userRingChannel(userId);
  await ensureSubscribed(ch);
  ch.on("broadcast", { event: "*" }, (msg) =>
    console.log("[RTC DEBUG]", msg.event, msg.payload)
  );
}
