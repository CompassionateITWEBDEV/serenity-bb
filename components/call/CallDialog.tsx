// file: app/components/CallDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import {
  userRingChannel,
  sendOfferToUser,
  sendAnswerToUser,
  sendIceToUser,
  sendHangupToUser,
} from "@/lib/webrtc/signaling";
import { supabase } from "@/lib/supabase/client";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  conversationId: string;
  role: CallRole;
  mode: CallMode;

  meId: string;
  meName: string;

  peerUserId: string;
  peerName?: string;
  peerAvatar?: string;
};

/* ---------- TURN (optional but recommended) ---------- */
const turnUrls = (process.env.NEXT_PUBLIC_TURN_URL || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(turnUrls.length
      ? [
          {
            urls: turnUrls,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          } as RTCIceServer,
        ]
      : []),
  ],
  iceTransportPolicy: "all",
  bundlePolicy: "balanced",
};

/* ---------- Global call guard ---------- */
declare global {
  interface Window { __callActive?: boolean }
}
function setCallActive(v: boolean) { try { window.__callActive = v; } catch {} }
function callActive() { try { return !!window.__callActive; } catch { return false } }

/* ---------- Types ---------- */
type MediaPreflight = { audioId?: string; videoId?: string; hasMic: boolean; hasCam: boolean };

/* ---------- Component ---------- */
export default function CallDialog({
  open,
  onOpenChange,
  conversationId,
  role,
  mode,
  meId,
  meName,
  peerUserId,
  peerName,
}: Props) {
  const [status, setStatus] = React.useState<"ringing" | "connecting" | "connected" | "ended" | "failed" | "missed">(
    role === "caller" ? "ringing" : "connecting"
  );
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(mode === "audio");
  const [dialSeconds, setDialSeconds] = React.useState(0);

  /* Media/setup error UI */
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [retryNonce, setRetryNonce] = React.useState(0);

  /* Core refs */
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null); // ensure audio playback cross-browser
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);

  /* Signaling */
  const chanRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);

  /* Timers/guards */
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);
  const closingRef = React.useRef(false);

  /* ICE race guard */
  const remoteDescSetRef = React.useRef(false);
  const pendingRemoteIce = React.useRef<RTCIceCandidateInit[]>([]);

  /* Disconnect grace */
  const disconnectGraceRef = React.useRef<number | null>(null);
  const DISCONNECT_GRACE_MS = 8_000;

  /* Re-send loops */
  const offerRetryRef = React.useRef<number | null>(null);
  const answerRetryRef = React.useRef<number | null>(null);
  const offerAttemptsRef = React.useRef(0);
  const answerAttemptsRef = React.useRef(0);
  const MAX_RESEND_ATTEMPTS = 20;
  const RESEND_MS = 1200;
  let lastOffer: RTCSessionDescriptionInit | null = null;
  let lastAnswer: RTCSessionDescriptionInit | null = null;

  /* Reflect controls to tracks */
  React.useEffect(() => {
    const s = localStreamRef.current; if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);
  React.useEffect(() => {
    const s = localStreamRef.current; if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [camOff]);

  /* Lifecycle */
  React.useEffect(() => {
    if (!open) {
      setCallActive(false);
      stopDialTimer();
      return;
    }

    if (callActive()) {
      setMediaError("A call is already starting. Please end it or wait, then try again.");
      setStatus("failed");
      return;
    }
    setCallActive(true);
    setMediaError(null);
    closingRef.current = false;

    const beforeUnload = () => { try { sendHangupToUser(peerUserId, conversationId); } catch {} };
    window.addEventListener("beforeunload", beforeUnload);

    (async () => {
      setStatus(role === "caller" ? "ringing" : "connecting");

      // 1) Subscribe BEFORE signaling (prevents missed first SDP/ICE)
      const ch = userRingChannel(meId);
      chanRef.current = ch;
      await ensureSubscribed(ch);

      // 2) Robust media preflight + gUM retries
      const stream = await getUserStreamWithRetries(mode).catch((err: any) => {
        setMediaError(err?.message || "Media devices are unavailable.");
        setStatus("failed");
        throw err;
      });

      localStreamRef.current = stream;
      attachVideo(localRef.current, stream, true);

      // 3) RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Remote stream → video + hidden audio
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachVideo(remoteRef.current, remoteStream, false);
      attachAudio(remoteAudioRef.current, remoteStream);

      pc.addEventListener("track", (e) => {
        if (!remoteStreamRef.current) return;
        remoteStreamRef.current.addTrack(e.track);
        forcePlay(remoteRef.current);
        forcePlay(remoteAudioRef.current);
        e.track.onended = () => { if (allRemoteTracksEnded()) endDueToRemote(); };
      });

      // Trickle ICE
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await sendIceToUser(peerUserId, { conversationId, fromId: meId, candidate: e.candidate.toJSON() });
          } catch {}
        }
      };
      pc.addEventListener("icecandidateerror", (e) => console.warn("[RTC] icecandidateerror", e));

      // Connection lifecycle
      const clearDisconnectGrace = () => { if (disconnectGraceRef.current) { clearTimeout(disconnectGraceRef.current); disconnectGraceRef.current = null; } };
      const scheduleDisconnectGrace = () => {
        if (disconnectGraceRef.current) return;
        disconnectGraceRef.current = window.setTimeout(() => endDueToRemote(), DISCONNECT_GRACE_MS) as unknown as number;
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          answeredRef.current = true;
          setStatus("connected");
          stopDialTimer();
          clearDisconnectGrace();
          forcePlay(localRef.current);
          forcePlay(remoteRef.current);
          forcePlay(remoteAudioRef.current);
          stopResendOffer();
          stopResendAnswer();
        } else if (s === "disconnected") {
          scheduleDisconnectGrace();
        } else if (s === "failed" || s === "closed") {
          endDueToRemote();
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === "connected" || s === "completed") {
          clearDisconnectGrace();
        } else if (s === "disconnected") {
          scheduleDisconnectGrace();
        } else if (s === "failed" || s === "closed") {
          endDueToRemote();
        }
      };

      // 4) Signaling handlers
      ch.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current || p?.sdp?.type !== "answer") return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;
          for (const c of pendingRemoteIce.current) { try { await pcRef.current.addIceCandidate(c); } catch {} }
          pendingRemoteIce.current = [];
          stopResendOffer();
        } catch {}
      });

      ch.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
        if (!pcRef.current || role !== "callee") return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;

        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;

          for (const c of pendingRemoteIce.current) { try { await pcRef.current.addIceCandidate(c); } catch {} }
          pendingRemoteIce.current = [];

          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          lastAnswer = ans;
          await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: ans });
          setStatus("connecting");
          startResendAnswer(); // keep answering until caller applies
        } catch {
          cleanupAndClose("failed");
        }
      });

      ch.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current) return;
        if (!remoteDescSetRef.current) { pendingRemoteIce.current.push(p.candidate); return; }
        try { await pcRef.current.addIceCandidate(p.candidate); } catch {}
      });

      ch.on("broadcast", { event: "hangup" }, () => endDueToRemote());

      ch.subscribe();

      // 5) Caller → send offer (+resend loop)
      if (role === "caller") {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
          await pc.setLocalDescription(offer);
          lastOffer = offer;
          await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
          startDialTimer();
          startResendOffer();
        } catch {
          cleanupAndClose("failed");
        }
      }
    })().catch(() => { /* media error already surfaced */ });

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      stopResendOffer();
      stopResendAnswer();
      teardownSignalingAndPc();
      setCallActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retryNonce]);

  /* ---------- Re-send loops ---------- */
  function startResendOffer() {
    stopResendOffer();
    offerAttemptsRef.current = 0;
    offerRetryRef.current = window.setInterval(async () => {
      if (remoteDescSetRef.current || offerAttemptsRef.current >= MAX_RESEND_ATTEMPTS || status === "connected") {
        stopResendOffer();
        return;
      }
      offerAttemptsRef.current += 1;
      if (lastOffer) { try { await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: lastOffer }); } catch {} }
    }, RESEND_MS) as unknown as number;
  }
  function stopResendOffer() {
    if (offerRetryRef.current) { clearInterval(offerRetryRef.current); offerRetryRef.current = null; }
  }

  function startResendAnswer() {
    stopResendAnswer();
    answerAttemptsRef.current = 0;
    answerRetryRef.current = window.setInterval(async () => {
      if (status === "connected" || answerAttemptsRef.current >= MAX_RESEND_ATTEMPTS) {
        stopResendAnswer();
        return;
      }
      answerAttemptsRef.current += 1;
      if (lastAnswer) { try { await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: lastAnswer }); } catch {} }
    }, RESEND_MS) as unknown as number;
  }
  function stopResendAnswer() {
    if (answerRetryRef.current) { clearInterval(answerRetryRef.current); answerRetryRef.current = null; }
  }

  /* ---------- timers ---------- */
  function startDialTimer() {
    stopDialTimer();
    setDialSeconds(0);
    dialTickRef.current = window.setInterval(() => setDialSeconds((v) => v + 1), 1000) as unknown as number;

    dialTimerRef.current = window.setTimeout(async () => {
      if (!answeredRef.current) {
        setStatus("missed");
        try { await sendHangupToUser(peerUserId, conversationId); } catch {}
        cleanupAndClose("missed");
      }
    }, 5 * 60 * 1000) as unknown as number;
  }
  function stopDialTimer() {
    if (dialTimerRef.current) { clearTimeout(dialTimerRef.current); dialTimerRef.current = null; }
    if (dialTickRef.current) { clearInterval(dialTickRef.current); dialTickRef.current = null; }
  }

  /* ---------- UI controls ---------- */
  async function onHangupClick() {
    try { await sendHangupToUser(peerUserId, conversationId); } catch {}
    cleanupAndClose("ended");
  }

  /* ---------- media element helpers ---------- */
  function forcePlay(el: HTMLMediaElement | null | undefined) {
    if (!el) return;
    // retry a few times to bypass racy autoplay policies
    const tryPlay = (n = 8) => {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { if (n > 0) setTimeout(() => tryPlay(n - 1), 250); });
      }
    };
    tryPlay();
  }
  function attachVideo(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.muted = mirror;
    el.playsInline = true;
    el.autoplay = true;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
    forcePlay(el);
  }
  function attachAudio(el: HTMLAudioElement | null, stream: MediaStream | null) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.autoplay = true;
    el.controls = false;
    el.muted = false;
    forcePlay(el);
  }

  /* ---------- robust gUM ---------- */
  async function ensureMediaPreflight(m: CallMode): Promise<MediaPreflight> {
    if (typeof window === "undefined") throw new Error("Media not available.");
    if (!window.isSecureContext) throw new Error("Use HTTPS to access camera/mic, then try again.");
    const md = navigator.mediaDevices as any;
    if (!md || typeof md.getUserMedia !== "function" || typeof md.enumerateDevices !== "function") {
      throw new Error("Media devices API is unavailable in this browser.");
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    const hasMic = audioInputs.length > 0;
    const hasCam = videoInputs.length > 0;
    if (!hasMic) throw new Error("Plug in or enable a microphone/camera, then click Try again.");
    if (m === "video" && !hasCam) throw new Error("Plug in or enable a microphone/camera, then click Try again.");
    return { audioId: audioInputs[0]?.deviceId, videoId: videoInputs[0]?.deviceId, hasMic, hasCam };
  }

  function buildConstraints(
    m: CallMode,
    ids: { audioId?: string; videoId?: string },
    quality: "strict" | "relaxed" | "fallback"
  ): MediaStreamConstraints {
    const audio: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(ids.audioId && quality !== "relaxed" ? { deviceId: { exact: ids.audioId } } : {}),
    };
    const videoStrict: MediaTrackConstraints = {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      ...(ids.videoId && quality !== "relaxed" ? { deviceId: { exact: ids.videoId } } : {}),
    };
    const videoRelaxed: MediaTrackConstraints = {
      width: { ideal: 640 },
      height: { ideal: 360 },
      frameRate: { ideal: 24 },
      ...(ids.videoId ? { deviceId: { ideal: ids.videoId } } : {}),
    };
    return { audio, video: m === "video" ? (quality === "strict" ? videoStrict : quality === "relaxed" ? videoRelaxed : true) : false };
  }

  async function getUserStreamWithRetries(m: CallMode): Promise<MediaStream> {
    let pre: MediaPreflight;
    try { pre = await ensureMediaPreflight(m); }
    catch (err: any) { throw new Error(err?.message || "Media devices are unavailable."); }

    try {
      return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "strict"));
    } catch (e: any) {
      const name = e?.name || "";

      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        try { pre = await ensureMediaPreflight(m); }
        catch { throw new Error("Plug in or enable a microphone/camera, then click Try again."); }
        try {
          return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "relaxed"));
        } catch {
          try {
            return await navigator.mediaDevices.getUserMedia({ audio: true, video: m === "video" ? true : false });
          } catch {
            throw new Error("Plug in or enable a microphone/camera, then click Try again.");
          }
        }
      }

      if (name === "OverconstrainedError") {
        try { return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "fallback")); }
        catch { throw new Error("Could not match camera settings. Try again."); }
      }

      if (name === "NotReadableError" || name === "AbortError") {
        throw new Error("Camera or microphone is in use by another app or tab. Close it, then click Try again.");
      }

      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new Error("Allow Camera and Microphone for this site, then try again.");
      }

      throw new Error("Could not access microphone/camera. Please try again.");
    }
  }

  /* ---------- misc ---------- */
  function allRemoteTracksEnded(): boolean {
    const rs = remoteStreamRef.current; if (!rs) return false;
    const tracks = rs.getTracks();
    return tracks.length > 0 && tracks.every((t) => t.readyState === "ended");
  }

  function endDueToRemote() {
    try { sendHangupToUser(peerUserId, conversationId); } catch {}
    cleanupAndClose("ended");
  }

  function teardownSignalingAndPc() {
    if (chanRef.current) { try { supabase.removeChannel(chanRef.current); } catch {} chanRef.current = null; }
    try { pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop()); pcRef.current?.getReceivers().forEach((r) => r.track && r.track.stop()); pcRef.current?.close(); } catch {}
    pcRef.current = null;

    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { remoteStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    stopDialTimer();
    if (disconnectGraceRef.current) { clearTimeout(disconnectGraceRef.current); disconnectGraceRef.current = null; }
    stopResendOffer();
    stopResendAnswer();
    remoteDescSetRef.current = false;
    pendingRemoteIce.current = [];
    answeredRef.current = false;
    closingRef.current = false;
  }

  function cleanupAndClose(finalStatus: "ended" | "failed" | "missed") {
    if (closingRef.current) return;
    closingRef.current = true;
    setStatus(finalStatus);
    teardownSignalingAndPc();
    if (finalStatus === "ended") { closingRef.current = false; return; } // keep dialog showing "Call ended"
    onOpenChange(false);
  }

  function ensureSubscribed(channel: ReturnType<typeof userRingChannel>) {
    return new Promise<void>((resolve) => {
      let done = false;
      channel.subscribe((s) => { if (!done && s === "SUBSCRIBED") { done = true; resolve(); } });
    });
  }

  /* ---------- UI ---------- */
  return (
    <Dialog
      open={open}
      onOpenChange={(v) =>
        v
          ? onOpenChange(true)
          : (sendHangupToUser(peerUserId, conversationId), cleanupAndClose("ended"), setCallActive(false))
      }
    >
      <DialogContent className="max-w-3xl overflow-hidden" aria-describedby="call-desc">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {status === "ringing" && <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(dialSeconds)}</span>}
            {status === "connecting" && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
            {status === "connected" && <span className="ml-2 text-xs text-green-600">Connected</span>}
            {status === "ended" && <span className="ml-2 text-xs text-gray-500">Call ended</span>}
          </DialogTitle>
          <DialogDescription id="call-desc" className="sr-only">
            Real-time {mode} call with {peerName || "contact"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* REMOTE */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={remoteRef} className="h-full w-full object-cover" />
            <audio ref={remoteAudioRef} className="hidden" />
            {status !== "connected" && status !== "ended" && !mediaError && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
            {status === "ended" && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Call ended</div>}
            {mediaError && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-white">
                <div className="rounded-lg bg-black/60 p-3">
                  <p className="mb-2">{mediaError}</p>
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      onClick={() => {
                        setMediaError(null);
                        setStatus(role === "caller" ? "ringing" : "connecting");
                        setRetryNonce((n) => n + 1);
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LOCAL */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={localRef} className="h-full w-full object-cover" />
            {camOff && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Camera off</div>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {status !== "ended" ? (
            <>
              <Button variant={muted ? "secondary" : "default"} onClick={() => setMuted((v) => !v)} className="rounded-full" title={muted ? "Unmute" : "Mute"}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {mode === "video" && (
                <Button variant={camOff ? "secondary" : "default"} onClick={() => setCamOff((v) => !v)} className="rounded-full" title={camOff ? "Turn camera on" : "Turn camera off"}>
                  {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}

              <Button variant="destructive" onClick={onHangupClick} className="rounded-full" title="End call">
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled className="rounded-full" title="Call ended">
                Call ended
              </Button>
              <Button onClick={() => onOpenChange(false)} className="rounded-full" title="Close">
                Close
              </Button>
            </>
          )}
        </div>

        {status === "missed" && <p className="mt-2 text-center text-sm text-gray-500">No answer. Call timed out after 5 minutes.</p>}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- utils ---------- */
function formatTime(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r.toString().padStart(2, "0")}`; }
