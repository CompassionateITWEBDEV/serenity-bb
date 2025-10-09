export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
    // IMPORTANT: replace with your own TURN. Examples for coturn / Twilio:
    ...(process.env.NEXT_PUBLIC_TURN_URL
      ? [{
          urls: process.env.NEXT_PUBLIC_TURN_URL!.split(",").map(s => s.trim()),
          username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
        }]
      : []),
  ],
};

import { supabase } from "@/lib/supabase/client";

/** Always use the same channel name on both apps (patient/staff). */
export function sigChannel(conversationId: string, self = true) {
  return supabase.channel(`video_${conversationId}`, { config: { broadcast: { self } } });
}

/** Spin until subscribed so first broadcast won't be dropped. */
export async function ensureSubscribed(ch: ReturnType<typeof sigChannel>, timeoutMs = 4000) {
  let ready = false;
  const p = new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") { ready = true; resolve(); }
    });
  });
  const timer = new Promise<void>((_, rej) => setTimeout(() => rej(new Error("Signaling not ready")), timeoutMs));
  await Promise.race([p, timer]);
  if (!ready) throw new Error("Signaling not ready");
  return ch;
}
