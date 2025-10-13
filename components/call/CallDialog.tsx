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

/** TURN (optional; recommended in prod) */
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

  // Core refs
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);

  // Signaling channel (this side)
  const chanRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);

  // Timers/guards
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);
  const closingRef = React.useRef(false);

  // ICE race handling
  const remoteDescSetRef = React.useRef(false);
  const pendingRemoteIce = React.useRef<RTCIceCandidateInit[]>([]);

  // Remote disconnect grace
  const disconnectGraceRef = React.useRef<number | null>(null);
  const DISCONNECT_GRACE_MS = 8_000;

  // Offer resend (prevents first-message drop)
  const offerRetryRef = React.useRef<number | null>(null);
  const offerAttemptsRef = React.useRef(0);
  const MAX_OFFER_ATTEMPTS = 6;
  let lastOffer: RTCSessionDescriptionInit | null = null;

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

      // 0) Subscribe FIRST to avoid dropping early signals
      const ch = userRingChannel(meId);
      chanRef.current = ch;
      await ensureSubscribed(ch);

      // 1) Local media first
      const stream = await getUserStream(mode);
      if (cancelled) return;
      localStreamRef.current = stream;
      attachStream(localRef.current, stream, true);

      // 2) RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Debug
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

      // 3) Add local tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 4) Remote stream + autoplay
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachStream(remoteRef.current, remoteStream, false);

      pc.addEventListener("track", (e) => {
        if (!remoteStreamRef.current) return;
        remoteStreamRef.current.addTrack(e.track);

        // Autoplay immediately when first remote track arrives
        forcePlay(remoteRef.current);

        // Detect remote leaving via track end
        e.track.onended = () => {
          if (allRemoteTracksEnded()) endDueToRemote();
        };
      });

      // 5) ICE → send to peer
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

      // 6) Auto-connect transitions + immediate end on remote drop
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
          // Stop resending offer once connected
          stopResendOffer();
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

      // 7) Signaling handlers (now safe; we're subscribed)
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
          // We got the answer → stop offer retries
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

      // 8) Caller: create + send offer (with resend guard)
      if (role === "caller") {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });
          await pc.setLocalDescription(offer);
          lastOffer = offer;
          await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
          startDialTimer();
          startResendOffer(); // mitigate receiver-not-subscribed race
        } catch {
          cleanupAndClose("failed");
        }
      }
    })().catch(() => {
      cleanupAndClose("failed");
    });

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      stopResendOffer();
      teardownSignalingAndPc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ensure we are SUBSCRIBED before signaling */
  function ensureSubscribed(channel: ReturnType<typeof userRingChannel>) {
    return new Promise<void>((resolve) => {
      let done = false;
      channel.subscribe((status) => {
        if (!done && status === "SUBSCRIBED") {
          done = true;
          resolve();
        }
      });
    });
  }

  /* offer resend loop */
  function startResendOffer() {
    stopResendOffer();
    offerAttemptsRef.current = 0;
    offerRetryRef.current = window.setInterval(async () => {
      if (remoteDescSetRef.current || offerAttemptsRef.current >= MAX_OFFER_ATTEMPTS) {
        stopResendOffer();
        return;
      }
      offerAttemptsRef.current += 1;
      if (lastOffer) {
        try {
          await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: lastOffer });
        } catch {}
      }
    }, 1500) as unknown as number;
  }
  function stopResendOffer() {
    if (offerRetryRef.current) {
      clearInterval(offerRetryRef.current);
      offerRetryRef.current = null;
    }
  }

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

  /* helpers */
  function forcePlay(el: HTMLVideoElement | null | undefined) {
    if (!el) return;
    const tryPlay = (attempts = 6) => {
      const p = el.play();
      if (!p || typeof p.catch !== "function") return;
      p.catch(() => {
        if (attempts <= 0) return;
        setTimeout(() => tryPlay(attempts - 1), 250);
      });
    };
    tryPlay();
  }

  function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.muted = mirror;              // local preview muted; remote audible
    el.playsInline = true;
    el.autoplay = true;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
    forcePlay(el);
  }

  async function getUserStream(m: CallMode) {
    const constraints: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: m === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      throw new Error("Could not access microphone/camera. Please allow permissions.");
    }
  }

  function allRemoteTracksEnded(): boolean {
    const rs = remoteStreamRef.current;
    if (!rs) return false;
    const tracks = rs.getTracks();
    return tracks.length > 0 && tracks.every((t) => t.readyState === "ended");
  }

  function endDueToRemote() {
    // Mirror Messenger: instant "Call ended"
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
    stopResendOffer();
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

    // Keep dialog open when ended (to show state + Close button)
    if (finalStatus === "ended") {
      closingRef.current = false;
      return;
    }

    onOpenChange(false);
  }

  /* IMPORTANT: ensure local close notifies peer */
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
            {status !== "connected" && status !== "ended" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
            {status === "ended" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Call ended</div>
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
