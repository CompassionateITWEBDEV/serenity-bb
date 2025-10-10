import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * We keep exactly one live Realtime channel per user.
 * - Broadcast ACKs enabled
 * - Safe subscribe/await before sending
 */

type ChanState = {
  chan: RealtimeChannel;
  subscribed: boolean;
  subscribing?: Promise<void>;
};

const CHANS = new Map<string, ChanState>();

function channelName(userId: string) {
  return `webrtc_user_${userId}`;
}

/**
 * Ensure a per-user channel exists and is subscribed.
 * - Returns the channel
 * - Awaits subscription (with ACK) if needed when `await ensure = true`
 */
async function ensureSubscribed(userId: string): Promise<RealtimeChannel> {
  let st = CHANS.get(userId);
  if (!st) {
    const chan = supabase.channel(channelName(userId), {
      config: { broadcast: { ack: true } },
    });
    st = { chan, subscribed: false };
    CHANS.set(userId, st);
  }

  if (!st.subscribed) {
    // Debounce multiple concurrent callers.
    if (!st.subscribing) {
      st.subscribing = new Promise<void>((resolve, reject) => {
        st!.chan
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              st!.subscribed = true;
              resolve();
            }
          })
          .catch(reject);
      }).finally(() => {
        st!.subscribing = undefined;
      });
    }
    await st.subscribing;
  }

  return st.chan;
}

/**
 * Public helper: get the user channel *immediately* so callers can attach .on(...)
 * This mirrors the tutorial: you can register handlers before subscribe completes.
 * We also kick off the subscribe in the background.
 */
export function userRingChannel(userId: string): RealtimeChannel {
  let st = CHANS.get(userId);
  if (!st) {
    const chan = supabase.channel(channelName(userId), {
      config: { broadcast: { ack: true } },
    });
    st = { chan, subscribed: false };
    CHANS.set(userId, st);

    // Fire-and-forget subscribe so listeners start receiving soon.
    st.subscribing = new Promise<void>((resolve, reject) => {
      chan
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            st!.subscribed = true;
            resolve();
          }
        })
        .catch(reject);
    }).finally(() => {
      st!.subscribing = undefined;
    });
  }
  return st.chan;
}

/** Optional: cleanup all channels (e.g., on logout) */
export async function closeAllSignalingChannels() {
  await Promise.all(
    [...CHANS.values()].map(async ({ chan }) => {
      try {
        await supabase.removeChannel(chan);
      } catch {}
    })
  );
  CHANS.clear();
}

/* -------------------------------------------------------------------------- */
/*                          Convenience send functions                        */
/* -------------------------------------------------------------------------- */

async function sendWithAck(toUserId: string, event: string, payload: any) {
  const chan = await ensureSubscribed(toUserId);
  const res = await chan.send({ type: "broadcast", event, payload });
  // supabase-js returns { status: "ok" | "timed_out" }
  if ((res as any)?.status !== "ok") {
    throw new Error(`Signaling "${event}" timed out`);
  }
}

/** RING (incoming banner) */
export async function sendRing(
  toUserId: string,
  payload: { conversationId: string; fromId: string; fromName?: string; mode: "audio" | "video" }
) {
  return sendWithAck(toUserId, "ring", payload);
}

/** HANGUP */
export async function sendHangupToUser(toUserId: string, conversationId?: string) {
  return sendWithAck(toUserId, "hangup", { conversationId });
}

/** SDP OFFER */
export async function sendOfferToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return sendWithAck(toUserId, "webrtc-offer", payload);
}

/** SDP ANSWER */
export async function sendAnswerToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
) {
  return sendWithAck(toUserId, "webrtc-answer", payload);
}

/** ICE CANDIDATE */
export async function sendIceToUser(
  toUserId: string,
  payload: { conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
) {
  return sendWithAck(toUserId, "webrtc-ice", payload);
}
