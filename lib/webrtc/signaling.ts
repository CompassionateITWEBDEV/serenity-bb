import { supabase } from "@/lib/supabase/client";

/* ============================================================================
 * WebRTC Signaling via Supabase Realtime (robust)
 * - Per-user broadcast channels: `webrtc_user_{userId}`
 * - Single subscribed channel per user (cached)
 * - ACKed sends with retry/backoff (prevents dropped first messages)
 * - Clean teardown helpers
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
  conversationId: string; // always present (was optional before)
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
// Why: Avoid sending on ad-hoc, unsubscribed channels which can drop early messages.
const ChannelCache = new Map<string, ReturnType<typeof supabase.channel>>();

function channelNameFor(userId: string) {
  return `webrtc_user_${userId}`;
}

/**
 * Get a broadcast channel for a user, lazily create+subscribe, and await SUBSCRIBED.
 * Multiple callers will reuse the same subscribed channel.
 */
export async function getUserChannel(userId: string) {
  const key = channelNameFor(userId);
  let ch = ChannelCache.get(key);

  if (!ch) {
    ch = supabase.channel(key, {
      config: { broadcast: { ack: true } },
    });
    ChannelCache.set(key, ch);
  }

  // Already subscribed
  if ((ch as any).state === "joined") return ch;

  // Subscribe and await SUBSCRIBED
  await new Promise<void>((resolve, reject) => {
    const sub = ch!.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        reject(new Error(`Channel ${key} subscribe failed: ${status}`));
      }
    });
    // Safety: if subscribe() returns synchronously joined (rare), resolve immediately
    if ((sub as any).state === "joined") resolve();
  });

  return ch;
}

/* ----------------------------- Send w/ ACK + Retry ------------------------ */
type SendResult = { status: "ok" | "timed_out" | "error"; response?: any };

async function sendWithAck(
  ch: ReturnType<typeof supabase.channel>,
  event: string,
  payload: unknown,
  opts: { attempts?: number; baseDelayMs?: number } = {}
): Promise<void> {
  const attempts = opts.attempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 200;

  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = (await ch.send({
        type: "broadcast",
        event,
        payload,
      })) as SendResult;

      if (res?.status === "ok") return;

      lastErr = new Error(`send ${event} not ok: ${res?.status}`);
    } catch (e) {
      lastErr = e;
    }
    // backoff: 200ms, 300ms, 450ms, ...
    const delay = Math.floor(baseDelayMs * Math.pow(1.5, i));
    await wait(delay);
  }
  throw lastErr ?? new Error(`send ${event} failed`);
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ----------------------------- Public API --------------------------------- */
/**
 * Subscribe to YOUR OWN channel to receive incoming ring/offer/answer/ice/hangup.
 * In your UI, call this once per dialog open and attach `.on("broadcast", ...)` handlers.
 */
export async function userRingChannel(userId: string) {
  return getUserChannel(userId); // ensures subscribed + cached
}

/** Initiate ring (notify callee). */
export async function sendRing(toUserId: string, payload: RingPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "ring", payload);
}

/** Hang up / decline: ends call on peer immediately. */
export async function sendHangupToUser(toUserId: string, conversationId: string) {
  const ch = await getUserChannel(toUserId);
  const payload: HangupPayload = { conversationId };
  await sendWithAck(ch, "hangup", payload);
}

/** WebRTC SDP Offer */
export async function sendOfferToUser(toUserId: string, payload: SDPPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "webrtc-offer", payload);
}

/** WebRTC SDP Answer */
export async function sendAnswerToUser(toUserId: string, payload: SDPPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "webrtc-answer", payload);
}

/** Trickle ICE */
export async function sendIceToUser(toUserId: string, payload: ICEPayload) {
  const ch = await getUserChannel(toUserId);
  await sendWithAck(ch, "webrtc-ice", payload);
}

/* ----------------------------- Utilities ---------------------------------- */
export async function broadcastToUsers(userIds: string[], event: string, payload: any) {
  // Send sequentially w/ ack to avoid fan-out throttling; parallel if needed.
  for (const id of userIds) {
    const ch = await getUserChannel(id);
    await sendWithAck(ch, event, payload);
  }
}

/**
 * Simple presence-ish check: returns true if we have a joined channel in cache.
 * Note: This checks *our* connection to that topic, not peer online presence.
 */
export function isUserChannelActive(userId: string): boolean {
  const ch = ChannelCache.get(channelNameFor(userId));
  const st = (ch as any)?.state;
  return st === "joined" || st === "joining";
}

/** Remove one user's channel (use when ending a call). */
export async function cleanupUserChannel(userId: string) {
  const key = channelNameFor(userId);
  const ch = ChannelCache.get(key);
  if (ch) {
    try {
      await supabase.removeChannel(ch);
    } catch {}
    ChannelCache.delete(key);
  }
}

/** Remove all cached channels (use on page unload / global cleanup). */
export async function cleanupAllUserChannels() {
  for (const [key, ch] of ChannelCache.entries()) {
    try {
      await supabase.removeChannel(ch);
    } catch {}
    ChannelCache.delete(key);
  }
}
