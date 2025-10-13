import { supabase } from "@/lib/supabase/client";

// ------------------ Types ------------------
export type SignalPayload =
  | { type: "webrtc-offer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-answer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-ice"; conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
  | { type: "hangup"; conversationId: string; fromId: string }
  | { type: "ring"; conversationId: string; fromId: string; fromName: string; mode: "audio" | "video" };

// ------------------ Channel Cache ------------------
// One channel per user id.
const channelCache = new Map<string, ReturnType<typeof supabase.channel>>();

// One readiness promise per channel instance.
const channelReady = new WeakMap<ReturnType<typeof supabase.channel>, Promise<void>>();

type Chan = ReturnType<typeof supabase.channel>;
type ChanState = "closed" | "errored" | "joining" | "joined" | "leaving" | "left" | string;

function mkChannel(userId: string): Chan {
  const ch = supabase.channel(`webrtc:${userId}`, { config: { broadcast: { self: false } } });
  channelReady.set(
    ch,
    new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`[RTC] Channel subscribe timeout for user ${userId}`)), 10_000);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(t);
          console.debug(`[RTC] Channel subscribed for user ${userId}`);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(t);
          reject(new Error(`[RTC] Channel error (${status}) for user ${userId}`));
        } else {
          console.debug(`[RTC] Channel status for ${userId}: ${status}`);
        }
      });
    })
  );
  return ch;
}

function isDead(state?: ChanState) {
  return state === "closed" || state === "left" || state === "leaving" || state === "errored";
}

// Create or refresh a healthy channel.
export function userRingChannel(userId: string): Chan {
  if (!userId) throw new Error("userId is required for userRingChannel");
  const cached = channelCache.get(userId);

  // If missing, or cached is dead, make a fresh one.
  if (!cached || isDead((cached as any).state as ChanState)) {
    const fresh = mkChannel(userId);
    channelCache.set(userId, fresh);
    return fresh;
  }
  return cached;
}

// Ensure current channel is joined; if dead, replace it.
async function ensureSubscribed(ch: Chan, userIdHint?: string): Promise<Chan> {
  const state = (ch as any).state as ChanState | undefined;

  // Dead? Recreate.
  if (isDead(state)) {
    const uid = userIdHint ?? ch.topic.replace(/^webrtc:/, "");
    const fresh = userRingChannel(uid);
    const p = channelReady.get(fresh);
    if (p) await p;
    return fresh;
  }

  // Not yet joined? Await its (possibly existing) ready promise.
  const p = channelReady.get(ch);
  if (p) {
    await p;
    return ch;
  }

  // No ready promise (edge)—subscribe now.
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("[RTC] subscribe timeout")), 10_000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(new Error(`[RTC] Channel error: ${status}`));
      }
    });
  });
  return ch;
}

// Generic sender with self-heal.
async function send(toUserId: string, event: string, payload: any) {
  let ch = userRingChannel(toUserId);
  ch = await ensureSubscribed(ch, toUserId);
  const { status, error } = await ch.send({ type: "broadcast", event, payload });
  if (status !== "ok") throw error ?? new Error(`Failed to send ${event}`);
}

// ------------------ Send helpers ------------------
export async function sendOfferToUser(toUserId: string, payload: Extract<SignalPayload, { type: "webrtc-offer" }>) {
  await send(toUserId, "webrtc-offer", payload);
}
export async function sendAnswerToUser(toUserId: string, payload: Extract<SignalPayload, { type: "webrtc-answer" }>) {
  await send(toUserId, "webrtc-answer", payload);
}
export async function sendIceToUser(toUserId: string, payload: Extract<SignalPayload, { type: "webrtc-ice" }>) {
  await send(toUserId, "webrtc-ice", payload);
}
export async function sendHangupToUser(toUserId: string, conversationId: string, fromId?: string) {
  await send(toUserId, "hangup", { type: "hangup", conversationId, fromId: fromId ?? "system" });
}
export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName: string; mode: "audio" | "video" }
) {
  await send(toUserId, "ring", payload);
}

// ------------------ Optional helpers ------------------
export async function warmUserRingChannel(userId: string) {
  const ch = userRingChannel(userId);
  await ensureSubscribed(ch, userId);
}

export async function attachDebugListener(userId: string) {
  const ch = await ensureSubscribed(userRingChannel(userId), userId);
  ch.on("broadcast", { event: "*" }, (msg) => console.log("[RTC DEBUG]", msg.event, msg.payload));
}
