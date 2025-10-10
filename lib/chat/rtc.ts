import { supabase } from "@/lib/supabase/client";

/** STUN+TURN. Replace TURN creds for production reliability. */
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // ✅ TURN — REQUIRED for users behind strict NATs / mobile carriers
    {
      urls: [
        "turn:global.turn.twilio.com:3478?transport=udp",
        "turn:global.turn.twilio.com:3478?transport=tcp",
        "turn:global.turn.twilio.com:443?transport=tcp",
      ],
      username: process.env.NEXT_PUBLIC_TURN_USERNAME as string,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL as string,
    },
  ],
};

const CH_PREFIX = "call:"; // single canonical prefix for ALL call UIs
const chName = (roomId: string) => `${CH_PREFIX}${roomId}`;

export function sigChannel(roomId: string, self = true) {
  return supabase.channel(chName(roomId), { config: { broadcast: { self } } });
}

export async function ensureSubscribed(
  ch: ReturnType<typeof sigChannel>,
  timeoutMs = 8000
): Promise<void> {
  // @ts-ignore fast-path set after success
  if (ch._joined) return;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Signaling subscribe timeout")), timeoutMs);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        // @ts-ignore
        ch._joined = true;
        resolve();
      } else if (["TIMED_OUT", "CLOSED", "CHANNEL_ERROR"].includes(status)) {
        clearTimeout(t);
        reject(new Error(status));
      }
    });
  });
}

export async function subscribeWithRetry(
  ch: ReturnType<typeof sigChannel>,
  { tries = 3, timeoutMs = 8000, delayMs = 700 }: { tries?: number; timeoutMs?: number; delayMs?: number } = {}
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
  if (!ch._joined) await subscribeWithRetry(ch);
  return ch;
}

export async function forcePlay(el?: HTMLMediaElement | null) {
  try { await el?.play(); } catch {}
}
