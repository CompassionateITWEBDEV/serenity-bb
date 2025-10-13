// lib/webrtc/media.ts
export type CallMode = "audio" | "video";

export async function getSafeMedia(mode: CallMode): Promise<MediaStream | null> {
  // 0) Some browsers need a dummy call to reveal device labels on enumerateDevices
  // If this throws NotAllowed, we still continue with best effort.
  try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}

  // 1) Inspect available devices
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const hasMic = devices.some(d => d.kind === "audioinput");
  const hasCam = devices.some(d => d.kind === "videoinput");

  // 2) Build constraints based on reality
  const wantsVideo = mode === "video" && hasCam;
  const wantsAudio = hasMic; // if no mic, don’t request it (prevents NotFoundError)

  const constraints: MediaStreamConstraints = {
    audio: wantsAudio ? { echoCancellation: true, noiseSuppression: true } : false,
    video: wantsVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  };

  // 3) Try exactly what we want
  try {
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    return s;
  } catch (err: any) {
    // If video failed, try audio-only
    if (wantsVideo) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: wantsAudio, video: false });
        return s;
      } catch {}
    }
    // If audio failed but we still want to let them in, return null
    // (join without local stream; they can still receive remote media)
    return null;
  }
}
