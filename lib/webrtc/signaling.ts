import { supabase } from "@/lib/supabase/client";

/* ============================================================================
 * WebRTC Signaling via Supabase Realtime (robust)
 * - Per-user broadcast channels: `webrtc_user_${userId}`
 * - Cache channels, subscribe once, ACK+retry on send
 * ========================================================================== */

/* ----------------------------- Types ------------------------------------- */
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

/* ----------------------------- Channel Cache ------------------------------ */
type RealtimeChannel = ReturnType<typeof supabase.channel>;

const channelCache = new Map<string, RealtimeChannel>();

function channelNameFor(userId: string) {
  return `webrtc_user_${userId}`;
}

/**
 * Return a (cached) channel. Caller may attach `.on(...)` and call `.subscribe()`.
 * Keeps old UI contracts where the UI manually subscribes.
 */
export function userRingChannel(userId: string): RealtimeChannel {
  const key = channelNameFor(userId);
  let ch = channelCache.get(key);
  if (!ch) {
    ch = supabase.channel(key, { config: { broadcast: { ack: true } } });
    channelCache.set(key, ch);
  }
  return ch;
}

/**
 * Internal: ensure the channel for a user is SUBSCRIBED before sending.
 */
async function getUserChannel(userId: string): Promise<RealtimeChannel> {
  const ch = userRingChannel(userId);
  // Already joined?
  if ((ch as any).state === "joined") return ch;

  await new Promise<void>((resolve, reject) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        reject(new Error(`Subscribe failed: ${status}`));
      }
    });
  });

  return ch;
}

/* ----------------------------- Send with ACK ------------------------------ */
type SendResult = { status: "ok" | "timed_out" | "error"; response?: any };

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
      if (res?.status === "ok") return;
      lastErr = new Error(`broadcast ${event} returned status: ${res?.status}`);
    } catch (e) {
      lastErr = e;
    }
    const delay = Math.floor(baseDelayMs * Math.pow(1.5, i));
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastErr ?? new Error(`broadcast ${event} failed`);
}

/* ----------------------------- Call Control ------------------------------- */
export async function sendRing(toUserId: string, payload: RingPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "ring", payload);
}

export async function sendHangupToUser(toUserId: string, conversationId?: string) {
  const ch = await getUserChannel(toUserId);
  const payload: HangupPayload = { conversationId };
  await sendWithAck(ch, "hangup", payload);
}

/* ----------------------------- WebRTC Signaling --------------------------- */
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

/* ----------------------------- Utilities ---------------------------------- */
export async function broadcastToUsers(userIds: string[], event: string, payload: any) {
  for (const id of userIds) {
    const ch = await getUserChannel(id);
    await sendWithAck(ch, event, payload);
  }
}

/**
 * Returns true if we have a cached, joined channel to that topic.
 * (Note: not peer presence; just our connection state.)
 */
export function isUserChannelActive(userId: string): boolean {
  const ch = channelCache.get(channelNameFor(userId));
  const st = (ch as any)?.state;
  return st === "joined" || st === "joining";
}

export async function cleanupUserChannel(userId: string) {
  const key = channelNameFor(userId);
  const ch = channelCache.get(key);
  if (!ch) return;
  try {
    await supabase.removeChannel(ch);
  } catch (err) {
    console.warn(`Failed to cleanup channel for user ${userId}:`, err);
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
