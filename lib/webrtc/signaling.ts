import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Per-user signaling over Supabase Realtime (broadcasts).
 *
 * Events:
 *  - "ring"            -> incoming call banner
 *  - "hangup"          -> end call
 *  - "webrtc-offer"    -> SDP offer
 *  - "webrtc-answer"   -> SDP answer
 *  - "webrtc-ice"      -> ICE candidates
 *
 * Notes:
 *  - Supabase JS v2: `channel.subscribe()` does NOT return a Promise.
 *    We wrap it in our own Promise (with timeout) to await subscription when needed.
 *  - We keep exactly one channel per user (singleton) to avoid duplicate handlers.
 */

type ChanState = {
  chan: RealtimeChannel;
  subscribed: boolean;
  subscribing?: Promise<void>;
};

const POOL = new Map<string, ChanState>();

function chanName(userId: string) {
  return `webrtc_user_${userId}`;
}

function getOrCreateState(userId: string): ChanState {
  const key = chanName(userId);
  const existing = POOL.get(key);
  if (existing) return existing;

  const chan = supabase.channel(key, {
    // ACK = we can await server confirmation on .send()
    config: { broadcast: { ack: true } },
  });
  const st: ChanState = { chan, subscribed: false };
  POOL.set(key, st);
  return st;
}

/**
 * Subscribe a channel and resolve once it's SUBSCRIBED (or timeout).
 * Never call `.catch()` on `subscribe()` — it is NOT a Promise in v2.
 */
async function ensureSubscribed(st: ChanState, timeoutMs = 8000): Promise<void> {
  if (st.subscribed) return;

  if (st.subscribing) return st.subscribing;

  st.subscribing = new Promise<void>((resolve, reject) => {
    let settled = false;

    // The subscribe callback receives status changes; resolve on SUBSCRIBED
    st.chan.subscribe((status) => {
      if (status === "SUBSCRIBED" && !settled) {
        settled = true;
        st.subscribed = true;
        resolve();
      }
    });

    // Safety net
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Realtime subscribe timed out"));
      }
    }, timeoutMs);

    // Also listen to system SUBSCRIBED (belt & suspenders)
    st.chan.on("system", { event: "SUBSCRIBED" }, () => {
      if (!settled) {
        settled = true;
        st.subscribed = true;
        clearTimeout(timer);
        resolve();
      }
    });
  });

  return st.subscribing.finally(() => {
    st.subscribing = undefined;
  });
}

/** Public: get the shared channel (created if needed). You can `.on(...).subscribe()` yourself if you want. */
export function userRingChannel(userId: string): RealtimeChannel {
  return getOrCreateState(userId).chan;
}

/** Public: ensure the channel is SUBSCRIBED before you use it. */
export async function ensureUserRingChannel(userId: string): Promise<RealtimeChannel> {
  const st = getOrCreateState(userId);
  await ensureSubscribed(st);
  return st.chan;
}

/** Optional: clean up a user's channel (e.g., on logout). */
export function closeUserRingChannel(userId: string) {
  const key = chanName(userId);
  const st = POOL.get(key);
  if (st) {
    try {
      supabase.removeChannel(st.chan);
    } catch {}
    POOL.delete(key);
  }
}

/* ------------------------ Broadcast helpers (ACKed) ------------------------ */

async function send(toUserId: string, event: string, payload: any): Promise<"ok" | "timed_out" | "error"> {
  // Use a fresh ephemeral channel for send OR the pooled one. Using pooled keeps connection hot.
  const st = getOrCreateState(toUserId);
  // We don't strictly need to subscribe to broadcast, but staying subscribed improves reliability.
  try {
    await ensureSubscribed(st);
  } catch {
    // ignore subscribe timeout; we can still try to send
  }

  const res = await st.chan.send({
    type: "broadcast",
    event,
    payload,
  });

  // res.status is "ok" | "timed_out"
  return (res as any)?.status ?? "ok";
}

export type CallMode = "audio" | "video";

export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName?: string; mode: CallMode }
) {
  return send(toUserId, "ring", payload);
}

export async function sendHangupToUser(toUserId: string, conversationId?: string) {
  return send(toUserId, "hangup", { conversationId });
}

export async function sendOfferToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return send(toUserId, "webrtc-offer", payload);
}

export async function sendAnswerToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return send(toUserId, "webrtc-answer", payload);
}

export async function sendIceToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
) {
  return send(toUserId, "webrtc-ice", payload);
}

/* ------------------------ Convenience listener API ------------------------ */
/**
 * Attach all signaling handlers for a user in one place.
 * Returns an unsubscribe function (removes the handlers; the channel stays alive).
 */
export async function listenSignaling(
  meUserId: string,
  handlers: Partial<{
    ring: (p: any) => void;
    hangup: (p: any) => void;
    offer: (p: any) => void;
    answer: (p: any) => void;
    ice: (p: any) => void;
  }>
) {
  const ch = await ensureUserRingChannel(meUserId);

  const unsubs: Array<() => void> = [];

  if (handlers.ring) {
    ch.on("broadcast", { event: "ring" }, (m) => handlers.ring!(m.payload));
    unsubs.push(() => ch.unsubscribe());
  }
  if (handlers.hangup) {
    ch.on("broadcast", { event: "hangup" }, (m) => handlers.hangup!(m.payload));
    unsubs.push(() => ch.unsubscribe());
  }
  if (handlers.offer) {
    ch.on("broadcast", { event: "webrtc-offer" }, (m) => handlers.offer!(m.payload));
    unsubs.push(() => ch.unsubscribe());
  }
  if (handlers.answer) {
    ch.on("broadcast", { event: "webrtc-answer" }, (m) => handlers.answer!(m.payload));
    unsubs.push(() => ch.unsubscribe());
  }
  if (handlers.ice) {
    ch.on("broadcast", { event: "webrtc-ice" }, (m) => handlers.ice!(m.payload));
    unsubs.push(() => ch.unsubscribe());
  }

  // We don't call supabase.removeChannel here; we only unhook handlers.
  return () => {
    try {
      // There is no fine-grained "off" API; simplest is to remove channel and recreate next time.
      closeUserRingChannel(meUserId);
    } catch {}
  };
}
