import { supabase } from "@/lib/supabase/client";

export type SignalPayload =
  | { type: "webrtc-offer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-answer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-ice"; conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
  | { type: "hangup"; conversationId: string; fromId: string }
  | { type: "ring"; conversationId: string; fromId: string; fromName: string; mode: "audio" | "video" };

// One realtime channel per user; reused for send + receive.
// Why: prevents duplicate connections & “connecting…” deadlocks.
const channelCache = new Map<string, ReturnType<typeof supabase.channel>>();
const readyMap = new WeakMap<ReturnType<typeof supabase.channel>, Promise<void>>();

function subscribeOnce(ch: ReturnType<typeof supabase.channel>, userId: string) {
  const p = new Promise<void>((resolve, reject) => {
    // Why: avoid silent hangs when network blocks Realtime
    const to = setTimeout(() => reject(new Error(`[RTC] subscribe timeout for ${userId}`)), 12000);

    ch.subscribe((status) => {
      // Radix: ok
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
  subscribeOnce(ch, userId); // kick off immediately
  channelCache.set(userId, ch);
  return ch;
}

async function ensureSubscribed(ch: ReturnType<typeof supabase.channel>, userId: string) {
  let p = readyMap.get(ch);
  if (!p) p = subscribeOnce(ch, userId); // defensive: if someone cleared the readyMap
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

// ---- Public send helpers ----
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
