import { supabase } from "@/lib/supabase/client";

/**
 * WHY: STUN-only fails behind symmetric NATs; add TURN for production.
 * Replace TURN creds with your own (coturn/Twilio/etc).
 */
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // STUN backup(s)
    { urls: ["stun:global.stun.twilio.com:3478"] },
    // TURN (REPLACE with real creds; remove if you inject from server)
    // { urls: "turn:your.turn.host:3478?transport=udp", username: "USER", credential: "PASS" },
    // { urls: "turns:your.turn.host:5349?transport=tcp", username: "USER", credential: "PASS" },
  ],
};

export const CHANNEL_PREFIX = "call:"; // MUST match everywhere (UI + staff/patient apps)
const channelName = (roomId: string) => `${CHANNEL_PREFIX}${roomId}`;

export function sigChannel(roomId: string, self = true) {
  // WHY: self=true lets you test both ends in one tab; handlers still guard by roomId.
  return supabase.channel(channelName(roomId), {
    config: { broadcast: { self } },
  });
}

/** Ensure the Supabase Realtime channel is subscribed (with timeout). */
export async function ensureSubscribed(
  ch: ReturnType<typeof sigChannel>,
  timeoutMs = 8000
): Promise<void> {
  // @ts-expect-error runtime field set after success for fast-path
  if (ch._joined) return;

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Signaling subscribe timeout")), timeoutMs);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        // @ts-expect-error mark joined for fast-path
        ch._joined = true;
        resolve();
      } else if (
        status === "TIMED_OUT" ||
        status === "CLOSED" ||
        status === "CHANNEL_ERROR"
      ) {
        clearTimeout(t);
        reject(new Error(status));
      }
    });
  });
}

/** Subscribe with retries for flaky networks. */
export async function subscribeWithRetry(
  ch: ReturnType<typeof sigChannel>,
  {
    tries = 3,
    timeoutMs = 8000,
    delayMs = 700,
  }: { tries?: number; timeoutMs?: number; delayMs?: number } = {}
) {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      await ensureSubscribed(ch, timeoutMs);
      // @ts-expect-error
      ch._joined = true;
      return ch;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/** Get (and subscribe) a reusable channel instance in a ref. */
export async function getSignalChannel(
  ref: { current: ReturnType<typeof sigChannel> | null },
  roomId: string,
  self = true
) {
  let ch = ref.current;
  if (!ch) {
    ch = sigChannel(roomId, self);
    ref.current = ch;
  }
  // @ts-expect-error
  if (!ch._joined) {
    await subscribeWithRetry(ch);
  }
  return ch;
}

/** Fire-and-forget broadcast helper. */
export async function sendEvent<T extends object = Record<string, unknown>>(
  ch: ReturnType<typeof sigChannel>,
  event: string,
  payload: T
) {
  await ch.send({ type: "broadcast", event, payload });
}

/** Register a broadcast handler, returns an unsubscribe fn. */
export function onEvent<T = any>(
  ch: ReturnType<typeof sigChannel>,
  event: string,
  handler: (payload: T) => void
) {
  const sub = ch.on("broadcast", { event }, (p) => {
    handler(p.payload as T);
  });
  return () => {
    try {
      // @ts-ignore remove single handler is not exposed; remove whole channel if needed outside
      sub.off?.();
    } catch {}
  };
}

/** Leave and cleanup a channel. */
export function leaveChannel(ref: { current: ReturnType<typeof sigChannel> | null }) {
  try {
    if (ref.current) {
      supabase.removeChannel(ref.current);
    }
  } catch {}
  ref.current = null as any;
}

/** Ensure autoplay after setting srcObject (esp. for audio). */
export async function ensureMediaAutoplay(el?: HTMLMediaElement | null) {
  if (!el) return;
  try {
    await el.play();
  } catch {
    // Ignore; UI should provide an Accept/Play gesture already.
  }
}
