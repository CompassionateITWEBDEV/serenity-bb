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

type MediaPreflight = {
  audioId?: string;
  videoId?: string;
  hasMic: boolean;
  hasCam: boolean;
};

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

  // Media/setup error UI
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [canRetry, setCanRetry] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);

  // Core refs
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);

  // Signaling
  const chanRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);

  // Timers/guards
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);
  const closingRef = React.useRef(false);

  // ICE race handling
  const remoteDescSetRef = React.useRef(false);
  const pendingRemoteIce = React.useRef<RTCIceCandidateInit[]>([]);

  // Disconnect grace
  const disconnectGraceRef = React.useRef<number | null>(null);
  const DISCONNECT_GRACE_MS = 8_000;

  /* reflect controls */
  React.useEffect(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);

  React.useEffect(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [camOff]);

  /* open/close lifecycle */
  React.useEffect(() => {
    if (!open) {
      stopDialTimer();
      return;
    }

    // reset error UI each open/retry
    setMediaError(null);
    setCanRetry(false);

    closingRef.current = false;
    let cancelled = false;

    const beforeUnload = () => {
      try {
        sendHangupToUser(peerUserId, conversationId);
      } catch {}
    };
    window.addEventListener("beforeunload", beforeUnload);

    (async () => {
      setStatus(role === "caller" ? "ringing" : "connecting");

      // Subscribe before signaling
      const ch = userRingChannel(meId);
      chanRef.current = ch;
      await ensureSubscribed(ch);

      // Media preflight + robust getUserMedia
      const stream = await getUserStreamWithRetries(mode).catch((err: any) => {
        // Map known messages to UI; never leave stuck
        const msg = String(err?.message || err || "Media devices are unavailable.");
        setMediaError(msg);
        setCanRetry(true);
        setStatus("failed"); // important: unblock UI state
        throw err;
      });
      if (cancelled) return;

      localStreamRef.current = stream;
      attachStream(localRef.current, stream, true);

      // RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      pc.addEventListener("icegatheringstatechange", () =>
        console.debug("[RTC]", "iceGatheringState:", pc.iceGatheringState)
      );
      pc.addEventListener("iceconnectionstatechange", () =>
        console.debug("[RTC]", "iceConnectionState:", pc.iceConnectionState)
      );
      pc.addEventListener("connectionstatechange", () =>
        console.debug("[RTC]", "connectionState:", pc.connectionState)
      );
      pc.addEventListener("signalingstatechange", () =>
        console.debug("[RTC]", "signalingState:", pc.signalingState)
      );
      pc.addEventListener("icecandidateerror", (e: any) => console.warn("[RTC]", "icecandidateerror", e));

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Remote stream
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachStream(remoteRef.current, remoteStream, false);

      pc.addEventListener("track", (e) => {
        if (!remoteStreamRef.current) return;
        remoteStreamRef.current.addTrack(e.track);
        forcePlay(remoteRef.current);
        e.track.onended = () => {
          if (allRemoteTracksEnded()) endDueToRemote();
        };
      });

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await sendIceToUser(peerUserId, {
              conversationId,
              fromId: meId,
              candidate: e.candidate.toJSON(),
            });
          } catch {}
        }
      };

      const clearDisconnectGrace = () => {
        if (disconnectGraceRef.current) {
          clearTimeout(disconnectGraceRef.current);
          disconnectGraceRef.current = null;
        }
      };
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

      // Signaling handlers
      ch.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current || p?.sdp?.type !== "answer") return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;
          for (const c of pendingRemoteIce.current) {
            try {
              await pcRef.current.addIceCandidate(c);
            } catch {}
          }
          pendingRemoteIce.current = [];
        } catch {}
      });

      ch.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
        if (!pcRef.current || role !== "callee") return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;

          for (const c of pendingRemoteIce.current) {
            try {
              await pcRef.current.addIceCandidate(c);
            } catch {}
          }
          pendingRemoteIce.current = [];

          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: ans });
          setStatus("connecting");
        } catch {
          cleanupAndClose("failed");
        }
      });

      ch.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current) return;
        if (!remoteDescSetRef.current) {
          pendingRemoteIce.current.push(p.candidate);
          return;
        }
        try {
          await pcRef.current.addIceCandidate(p.candidate);
        } catch {}
      });

      ch.on("broadcast", { event: "hangup" }, () => {
        endDueToRemote();
      });

      ch.subscribe();

      // Caller offer
      if (role === "caller") {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });
          await pc.setLocalDescription(offer);
          await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
          startDialTimer();
        } catch {
          cleanupAndClose("failed");
        }
      }
    })().catch(() => { /* media error already handled */ });

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      teardownSignalingAndPc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retryNonce]);

  /* timers */
  function startDialTimer() {
    stopDialTimer();
    setDialSeconds(0);
    dialTickRef.current = window.setInterval(() => {
      setDialSeconds((v) => v + 1);
    }, 1000) as unknown as number;

    dialTimerRef.current = window.setTimeout(async () => {
      if (!answeredRef.current) {
        setStatus("missed");
        try {
          await sendHangupToUser(peerUserId, conversationId);
        } catch {}
        cleanupAndClose("missed");
      }
    }, 5 * 60 * 1000) as unknown as number;
  }

  function stopDialTimer() {
    if (dialTimerRef.current) {
      clearTimeout(dialTimerRef.current);
      dialTimerRef.current = null;
    }
    if (dialTickRef.current) {
      clearInterval(dialTickRef.current);
      dialTickRef.current = null;
    }
  }

  /* UI controls */
  async function onHangupClick() {
    try {
      await sendHangupToUser(peerUserId, conversationId);
    } catch {}
    cleanupAndClose("ended");
  }

  /* autoplay helpers */
  function forcePlay(el: HTMLVideoElement | null | undefined) {
    if (!el) return;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.muted = mirror;
    el.playsInline = true;
    el.autoplay = true;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
    forcePlay(el);
  }

  /* ---------- Robust media preflight + retries ---------- */
  async function ensureMediaPreflight(m: CallMode): Promise<MediaPreflight> {
    if (typeof window === "undefined") throw new Error("Media not available.");
    if (!window.isSecureContext) {
      throw new Error("Use HTTPS: Media devices require a secure connection.");
    }
    const md = navigator.mediaDevices as any;
    if (!md || typeof md.getUserMedia !== "function" || typeof md.enumerateDevices !== "function") {
      throw new Error("Media devices API is unavailable in this browser.");
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    const hasMic = audioInputs.length > 0;
    const hasCam = videoInputs.length > 0;

    if (!hasMic) {
      throw new Error("Plug in or enable a microphone/camera, then click Try again.");
    }
    if (m === "video" && !hasCam) {
      throw new Error("Plug in or enable a microphone/camera, then click Try again.");
    }

    return {
      audioId: audioInputs[0]?.deviceId,
      videoId: videoInputs[0]?.deviceId,
      hasMic,
      hasCam,
    };
  }

  function buildConstraints(
    m: CallMode,
    ids: { audioId?: string; videoId?: string },
    quality: "strict" | "relaxed" | "fallback"
  ): MediaStreamConstraints {
    const baseAudio: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(ids.audioId && quality !== "relaxed" ? { deviceId: { exact: ids.audioId } } : {}),
    };

    const baseVideoStrict: MediaTrackConstraints = {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      ...(ids.videoId && quality !== "relaxed" ? { deviceId: { exact: ids.videoId } } : {}),
    };

    const baseVideoRelaxed: MediaTrackConstraints = {
      width: { ideal: 640 },
      height: { ideal: 360 },
      frameRate: { ideal: 24 },
      ...(ids.videoId ? { deviceId: { ideal: ids.videoId } } : {}),
    };

    const audio = baseAudio;
    const video =
      m === "video"
        ? quality === "strict"
          ? baseVideoStrict
          : quality === "relaxed"
          ? baseVideoRelaxed
          : true
        : false;

    return { audio, video };
  }

  async function getUserStreamWithRetries(m: CallMode): Promise<MediaStream> {
    // Preconditions + device picker
    let pre: MediaPreflight;
    try {
      pre = await ensureMediaPreflight(m);
    } catch (err: any) {
      const msg = String(err?.message || err);
      // Map to acceptance copy when relevant
      if (msg.includes("secure") || msg.includes("HTTPS")) {
        throw new Error("Use HTTPS to access camera/mic, then try again.");
      }
      if (msg.includes("API is unavailable")) {
        throw new Error("Media devices API is unavailable in this browser.");
      }
      if (msg.includes("Plug in or enable")) {
        throw new Error("Plug in or enable a microphone/camera, then click Try again.");
      }
      throw new Error(msg);
    }

    // Attempt 1: strict (picked devices, 720p)
    try {
      return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "strict"));
    } catch (e: any) {
      const name = e?.name || "";
      const msg = e?.message || "";
      // NotFound → retry relaxed (no exact device, lower res)
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        try {
          return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "relaxed"));
        } catch (e2: any) {
          // Final fallback: drop video constraints entirely if video mode
          if (m === "video") {
            try {
              return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            } catch (e3: any) {
              throw new Error("Plug in or enable a microphone/camera, then click Try again.");
            }
          }
          throw new Error("Plug in or enable a microphone/camera, then click Try again.");
        }
      }

      // Overconstrained → drop conflicting constraints and retry once
      if (name === "OverconstrainedError") {
        try {
          const c = buildConstraints(m, pre, "fallback");
          return await navigator.mediaDevices.getUserMedia(c);
        } catch {
          throw new Error("Could not match the requested camera settings. Try again.");
        }
      }

      // Permissions blocked
      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new Error("Allow Camera and Microphone for this site, then try again.");
      }

      // Generic
      console.warn("getUserMedia error:", name, msg);
      throw new Error("Could not access microphone/camera. Please try again.");
    }
  }

  function allRemoteTracksEnded(): boolean {
    const rs = remoteStreamRef.current;
    if (!rs) return false;
    const tracks = rs.getTracks();
    return tracks.length > 0 && tracks.every((t) => t.readyState === "ended");
  }

  function endDueToRemote() {
    try {
      sendHangupToUser(peerUserId, conversationId);
    } catch {}
    cleanupAndClose("ended");
  }

  function teardownSignalingAndPc() {
    if (chanRef.current) {
      try {
        supabase.removeChannel(chanRef.current);
      } catch {}
      chanRef.current = null;
    }

    try {
      pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop());
      pcRef.current?.getReceivers().forEach((r) => r.track && r.track.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    stopDialTimer();
    if (disconnectGraceRef.current) {
      clearTimeout(disconnectGraceRef.current);
      disconnectGraceRef.current = null;
    }
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

    if (finalStatus === "ended") {
      closingRef.current = false; // keep visible with "Call ended"
      return;
    }

    onOpenChange(false);
  }

  /* ensure we are SUBSCRIBED before signaling */
  function ensureSubscribed(channel: ReturnType<typeof userRingChannel>) {
    return new Promise<void>((resolve) => {
      let done = false;
      channel.subscribe((s) => {
        if (!done && s === "SUBSCRIBED") {
          done = true;
          resolve();
        }
      });
    });
  }

  /* dialog close → notify */
  const handleDialogOpenChange = (v: boolean) => {
    if (v) {
      onOpenChange(true);
    } else {
      try {
        sendHangupToUser(peerUserId, conversationId);
      } catch {}
      cleanupAndClose("ended");
    }
  };

  /* UI */
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden" aria-describedby="call-desc">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {status === "ringing" && (
              <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(dialSeconds)}</span>
            )}
            {status === "connecting" && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
            {status === "connected" && <span className="ml-2 text-xs text-xs text-green-600">Connected</span>}
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
            {status !== "connected" && status !== "ended" && !mediaError && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
            {status === "ended" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Call ended</div>
            )}
            {mediaError && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-white">
                <div className="rounded-lg bg-black/60 p-3">
                  <p className="mb-2">{mediaError}</p>
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      onClick={() => {
                        setMediaError(null);
                        setCanRetry(false);
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
              <Button
                variant={muted ? "secondary" : "default"}
                onClick={() => setMuted((v) => !v)}
                className="rounded-full"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {mode === "video" && (
                <Button
                  variant={camOff ? "secondary" : "default"}
                  onClick={() => setCamOff((v) => !v)}
                  className="rounded-full"
                  title={camOff ? "Turn camera on" : "Turn camera off"}
                >
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

        {status === "missed" && (
          <p className="mt-2 text-center text-sm text-gray-500">No answer. Call timed out after 5 minutes.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
