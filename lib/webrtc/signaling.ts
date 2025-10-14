// lib/webrtc/signaling.ts
"use client";

import { supabase } from "@/lib/supabase/client";

export type SignalPayload =
  | { type: "webrtc-offer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-answer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-ice"; conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
  | { type: "hangup"; conversationId: string; fromId: string }
  | { type: "ring"; conversationId: string; fromId: string; fromName: string; mode: "audio" | "video" };

// One realtime channel per user; reused for send + receive.
const channelCache = new Map<string, ReturnType<typeof supabase.channel>>();
const readyMap = new WeakMap<ReturnType<typeof supabase.channel>, Promise<void>>();

function subscribeOnce(ch: ReturnType<typeof supabase.channel>, userId: string) {
  const p = new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`[RTC] subscribe timeout for ${userId}`)), 12000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(to);
        console.debug(`[RTC] channel ready for ${userId}`);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(to);
        reject(new Error(`[RTC] subscribe failed (${status}) for ${userId}`));
      } else {
        console.debug(`[RTC] channel status for ${userId}: ${status}`);
      }
    });
  });
  readyMap.set(ch, p);
  return p;
}

export function userRingChannel(userId: string) {
  if (!userId) throw new Error("userId is required");

  const existing = channelCache.get(userId);
  if (existing) return existing;

  const ch = supabase.channel(`webrtc:${userId}`, {
    config: { broadcast: { self: false } },
  });
  subscribeOnce(ch, userId); // subscribe immediately
  channelCache.set(userId, ch);
  return ch;
}

async function ensureSubscribed(ch: ReturnType<typeof supabase.channel>, userId: string) {
  let p = readyMap.get(ch);
  if (!p) p = subscribeOnce(ch, userId);
  await p;
}

async function safeSend(
  ch: ReturnType<typeof supabase.channel>,
  userId: string,
  event: string,
  payload: unknown,
  errMsg: string
) {
  await ensureSubscribed(ch, userId);
  const { status, error } = await ch.send({ type: "broadcast", event, payload });
  if (status !== "ok") throw error ?? new Error(errMsg);
}

// ---- Public send helpers (unchanged API) ----
export async function sendOfferToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-offer" }>
) {
  const ch = userRingChannel(toUserId);
  console.debug("[RTC] send offer →", toUserId);
  await safeSend(ch, toUserId, "webrtc-offer", payload, "Failed to send offer");
}

export async function sendAnswerToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-answer" }>
) {
  const ch = userRingChannel(toUserId);
  console.debug("[RTC] send answer →", toUserId);
  await safeSend(ch, toUserId, "webrtc-answer", payload, "Failed to send answer");
}

export async function sendIceToUser(
  toUserId: string,
  payload: Extract<SignalPayload, { type: "webrtc-ice" }>
) {
  const ch = userRingChannel(toUserId);
  console.debug("[RTC] send ice →", toUserId);
  await safeSend(ch, toUserId, "webrtc-ice", payload, "Failed to send ICE");
}

export async function sendHangupToUser(toUserId: string, conversationId: string, fromId?: string) {
  const ch = userRingChannel(toUserId);
  console.debug("[RTC] send hangup →", toUserId);
  await safeSend(
    ch,
    toUserId,
    "hangup",
    { type: "hangup", conversationId, fromId: fromId ?? "system" },
    "Failed to send hangup"
  );
}

export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName: string; mode: "audio" | "video" }
) {
  const ch = userRingChannel(toUserId);
  console.debug("[RTC] send ring →", toUserId);
  await safeSend(ch, toUserId, "ring", payload, "Failed to send ring");
}

export async function attachDebugListener(userId: string) {
  const ch = userRingChannel(userId);
  await ensureSubscribed(ch, userId);
  ch.on("broadcast", { event: "*" }, (msg) => console.log("[RTC DEBUG]", msg.event, msg.payload));
}

/**
 * NEW: Subscribe to incoming WebRTC signals for a user.
 * Returns an unsubscribe function.
 *
 * Optional conversation filter: if provided, only callbacks for that conversationId will fire.
 */
export async function subscribeToSignals(
  userId: string,
  handlers: {
    onOffer?: (p: Extract<SignalPayload, { type: "webrtc-offer" }>) => void;
    onAnswer?: (p: Extract<SignalPayload, { type: "webrtc-answer" }>) => void;
    onIce?: (p: Extract<SignalPayload, { type: "webrtc-ice" }>) => void;
    onHangup?: (p: Extract<SignalPayload, { type: "hangup" }>) => void;
    onRing?: (p: Extract<SignalPayload, { type: "ring" }>) => void;
  },
  opts?: { conversationId?: string }
) {
  const ch = userRingChannel(userId);
  await ensureSubscribed(ch, userId);

  const convoOk = (payload: any) =>
    !opts?.conversationId || payload?.conversationId === opts.conversationId;

  const offs: Array<() => void> = [];

  const on = (event: string, cb: (payload: any) => void) => {
    const sub = ch.on("broadcast", { event }, ({ payload }) => {
      if (!payload) return;
      if (!convoOk(payload)) return;
      cb(payload);
    });
    offs.push(() => ch.unsubscribe()); // Supabase RT currently unsubs whole channel; we keep one channel/user.
    return sub;
  };

  handlers.onOffer &&
    on("webrtc-offer", (p) => handlers.onOffer!(p as Extract<SignalPayload, { type: "webrtc-offer" }>));
  handlers.onAnswer &&
    on("webrtc-answer", (p) => handlers.onAnswer!(p as Extract<SignalPayload, { type: "webrtc-answer" }>));
  handlers.onIce &&
    on("webrtc-ice", (p) => handlers.onIce!(p as Extract<SignalPayload, { type: "webrtc-ice" }>));
  handlers.onHangup &&
    on("hangup", (p) => handlers.onHangup!(p as Extract<SignalPayload, { type: "hangup" }>));
  handlers.onRing &&
    on("ring", (p) => handlers.onRing!(p as Extract<SignalPayload, { type: "ring" }>));


}
