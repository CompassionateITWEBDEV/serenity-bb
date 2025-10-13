import { supabase } from "@/lib/supabase/client";

/* ============================================================================
 * Robust Supabase Realtime signaling
 * - Cached per-user channels: `webrtc_user_${userId}`
 * - Subscribe-before-send
 * - sendWithAck: treat undefined status as success (Supabase can return void)
 * ========================================================================== */

export type CallMode = "audio" | "video";

export type RingPayload = {
  conversationId: string;
  fromId: string;
  fromName?: string;
  mode: CallMode;
};

export type HangupPayload = {
  conversationId?: string;
};

export type SDPPayload = {
  conversationId: string;
  fromId: string;
  sdp: RTCSessionDescriptionInit;
};

export type ICEPayload = {
  conversationId: string;
  fromId: string;
  candidate: RTCIceCandidateInit;
};

type RealtimeChannel = ReturnType<typeof supabase.channel>;

const channelCache = new Map<string, RealtimeChannel>();

function chanName(userId: string) {
  return `webrtc_user_${userId}`;
}

/** Create/return cached channel (not auto-subscribed). UI can attach listeners to this. */
export function userRingChannel(userId: string): RealtimeChannel {
  const name = chanName(userId);
  let ch = channelCache.get(name);
  if (!ch) {
    ch = supabase.channel(name, { config: { broadcast: { ack: true } } });
    channelCache.set(name, ch);
  }
  return ch;
}

/** Ensure channel is SUBSCRIBED before sending. */
async function getUserChannel(userId: string): Promise<RealtimeChannel> {
  const ch = userRingChannel(userId);
  const state = (ch as any).state;
  if (state === "joined") return ch;

  await new Promise<void>((resolve, reject) => {
    const sub = ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        reject(new Error(`Subscribe failed: ${status}`));
      }
    });
    // defensive: if join happened sync
    if ((sub as any)?.state === "joined") resolve();
  });

  return ch;
}

type SendResult = { status?: "ok" | "timed_out" | "error"; response?: unknown } | void;

/**
 * sendWithAck:
 * - If `send()` resolves and `res?.status` is missing → treat as success (Supabase often returns void).
 * - Retry only on thrown errors or explicit non-ok statuses.
 */
async function sendWithAck(
  ch: RealtimeChannel,
  event: string,
  payload: unknown,
  attempts = 5,
  baseDelayMs = 200
): Promise<void> {
  let lastErr: unknown = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = (await ch.send({ type: "broadcast", event, payload })) as SendResult;

      // If no status returned, assume success.
      if (!res || (res as any).status === undefined) return;

      const status = (res as any).status as SendResult extends { status: infer S } ? S : unknown;
      if (status === "ok") return;

      // Explicit error/timed_out → retry
      lastErr = new Error(`broadcast ${event} status: ${String(status)}`);
    } catch (e) {
      lastErr = e;
    }

    const delay = Math.floor(baseDelayMs * Math.pow(1.5, i));
    await new Promise((r) => setTimeout(r, delay));
  }

  throw lastErr ?? new Error(`broadcast ${event} failed`);
}

/* ----------------------------- Public API -------------------------------- */

export async function sendRing(toUserId: string, payload: RingPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "ring", payload);
}

export async function sendHangupToUser(toUserId: string, conversationId?: string) {
  const ch = await getUserChannel(toUserId);
  const payload: HangupPayload = { conversationId };
  await sendWithAck(ch, "hangup", payload);
}

export async function sendOfferToUser(toUserId: string, payload: SDPPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "webrtc-offer", payload);
}

export async function sendAnswerToUser(toUserId: string, payload: SDPPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "webrtc-answer", payload);
}

export async function sendIceToUser(toUserId: string, payload: ICEPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "webrtc-ice", payload);
}

/* ----------------------------- Utilities --------------------------------- */

export async function broadcastToUsers(userIds: string[], event: string, payload: any) {
  for (const id of userIds) {
    const ch = await getUserChannel(id);
    await sendWithAck(ch, event, payload);
  }
}

/** Our client’s channel state (not peer presence). */
export function isUserChannelActive(userId: string): boolean {
  const ch = channelCache.get(chanName(userId));
  const st = (ch as any)?.state;
  return st === "joined" || st === "joining";
}

export async function cleanupUserChannel(userId: string) {
  const key = chanName(userId);
  const ch = channelCache.get(key);
  if (!ch) return;
  try {
    await supabase.removeChannel(ch);
  } finally {
    channelCache.delete(key);
  }
}

export async function cleanupAllUserChannels() {
  for (const [key, ch] of channelCache.entries()) {
    try {
      await supabase.removeChannel(ch);
    } catch {}
    channelCache.delete(key);
  }
}
