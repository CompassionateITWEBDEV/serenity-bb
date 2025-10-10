import { supabase } from "@/lib/supabase/client";

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // TODO: replace with your TURN for production reliability
    { urls: ["stun:global.stun.twilio.com:3478"] },
  ],
};

const CH_PREFIX = "call:"; // single, canonical channel prefix used by ALL call UIs

export function sigChannel(roomId: string, self = true) {
  // broadcast.self=true ensures we can receive our own events when testing in a single client tab.
  // Safe in prod; the handlers guard by roomId anyway.
  return supabase.channel(`${CH_PREFIX}${roomId}`, {
    config: {
      broadcast: { self },
    },
  });
}

export async function ensureSubscribed(
  ch: ReturnType<typeof sigChannel>,
  timeoutMs = 8000
): Promise<void> {
  // @ts-ignore – runtime field set after success for fast-path
  if (ch._joined) return;

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Signaling subscribe timeout")), timeoutMs);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        // @ts-ignore
        ch._joined = true;
        resolve();
      } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
        clearTimeout(t);
        reject(new Error(status));
      }
    });
  });
}

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
      // @ts-ignore
      ch._joined = true;
      return ch;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

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
  // @ts-ignore
  if (!ch._joined) {
    await subscribeWithRetry(ch);
  }
  return ch;
}
