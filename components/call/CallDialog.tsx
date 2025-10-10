"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import {
  userRingChannel,
  sendOfferToUser,
  sendAnswerToUser,
  sendIceToUser,
  sendHangupToUser,
} from "@/lib/webrtc/signaling";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  conversationId: string;
  role: CallRole;        // "caller" -> create/send offer ; "callee" -> wait for offer
  mode: CallMode;

  meId: string;
  meName: string;

  peerUserId: string;    // REQUIRED: the userId of the other side
  peerName?: string;
  peerAvatar?: string;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  ],
};

export default function CallDialog(props: Props) {
  const {
    open, onOpenChange, conversationId, role, mode, meId, meName, peerUserId, peerName,
  } = props;

  const [status, setStatus] =
    React.useState<"ringing" | "connecting" | "connected" | "ended" | "failed" | "missed">(
      role === "caller" ? "ringing" : "connecting"
    );
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(mode === "audio");
  const [dialSeconds, setDialSeconds] = React.useState(0);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);

  // signaling channel to receive answer/ice/hangup
  const chanRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);

  // timers / state guards
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);
  const closingRef = React.useRef(false);

  // ICE-queue: if candidates arrive before remoteDescription is set
  const remoteDescSetRef = React.useRef(false);
  const pendingRemoteIce = React.useRef<RTCIceCandidateInit[]>([]);

  /* -------- controls reflect stream tracks -------- */
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

  /* -------------------- open/close lifecycle -------------------- */
  React.useEffect(() => {
    if (!open) {
      stopDialTimer();
      return;
    }

    closingRef.current = false;

    (async () => {
      setStatus(role === "caller" ? "ringing" : "connecting");

      // 1) Get local media
      const stream = await getUserStream(mode);
      localStreamRef.current = stream;
      attachStream(localRef.current, stream, true);

      // 2) Create PC
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // 3) Add local tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 4) Prepare remote stream (use track-by-track, more robust than e.streams[0])
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachStream(remoteRef.current, remoteStream, false);
      pc.addEventListener("track", (e) => {
        if (!remoteStreamRef.current) return;
        remoteStreamRef.current.addTrack(e.track);
      });

      // 5) Trickled ICE (send to peer)
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await sendIceToUser(peerUserId, {
              conversationId,
              fromId: meId,
              candidate: e.candidate.toJSON(),
            });
          } catch { /* ignore */ }
        }
      };

      // 6) Connection state watcher
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          answeredRef.current = true;
          setStatus("connected");
          stopDialTimer();
        } else if (s === "failed" || s === "disconnected") {
          // Allow brief ICE restart; otherwise end
          window.setTimeout(() => {
            if (!pcRef.current) return;
            const cs = pcRef.current.connectionState;
            if (cs === "failed" || cs === "disconnected") {
              cleanupAndClose("failed");
            }
          }, 2500);
        }
      };

      // 7) Subscribe to my user channel for remote SDP/ICE/HANGUP
      const ch = userRingChannel(meId);
      chanRef.current = ch;

      ch.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
        if (!pcRef.current) return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (p?.sdp?.type === "answer") {
          try {
            await pcRef.current.setRemoteDescription(p.sdp);
            remoteDescSetRef.current = true;
            // flush queued ICE
            for (const c of pendingRemoteIce.current) {
              try { await pcRef.current.addIceCandidate(c); } catch {}
            }
            pendingRemoteIce.current = [];
          } catch { /* ignore */ }
        }
      });

      ch.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
        // Callee path
        if (!pcRef.current || role !== "callee") return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;

          // Apply any queued ICE that arrived early
          for (const c of pendingRemoteIce.current) {
            try { await pcRef.current.addIceCandidate(c); } catch {}
          }
          pendingRemoteIce.current = [];

          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          await sendAnswerToUser(peerUserId, {
            conversationId, fromId: meId, sdp: ans,
          });
          setStatus("connecting");
        } catch {
          cleanupAndClose("failed");
        }
      });

      ch.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current) return;
        // Queue if remoteDescription not yet set (Safari/Firefox race)
        if (!remoteDescSetRef.current) {
          pendingRemoteIce.current.push(p.candidate);
          return;
        }
        try { await pcRef.current.addIceCandidate(p.candidate); } catch { /* benign */ }
      });

      ch.on("broadcast", { event: "hangup" }, () => {
        cleanupAndClose("ended");
      });

      ch.subscribe(); // (supabase v2: callback-based; no .catch())

      // 8) Caller: create and send OFFER + start timeout
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
    })().catch(() => {
      cleanupAndClose("failed");
    });

    // No return cleanup; all teardown is centralized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* -------------------- timers -------------------- */
  function startDialTimer() {
    stopDialTimer();
    setDialSeconds(0);
    dialTickRef.current = window.setInterval(() => {
      setDialSeconds((v) => v + 1);
    }, 1000) as unknown as number;

    // 5-minute no-answer timeout
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

  /* -------------------- controls -------------------- */
  async function onHangupClick() {
    try { await sendHangupToUser(peerUserId, conversationId); } catch {}
    cleanupAndClose("ended");
  }

  /* -------------------- helpers -------------------- */
  function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.muted = mirror; // mute local preview
    el.playsInline = true;
    el.autoplay = true;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
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

  function cleanupAndClose(finalStatus: "ended" | "failed" | "missed") {
    if (closingRef.current) return;
    closingRef.current = true;

    stopDialTimer();
    setStatus(finalStatus);

    try {
      pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop());
      pcRef.current?.getReceivers().forEach((r) => r.track && r.track.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { remoteStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    // Do NOT remove the shared user channel here (other parts of the app may be listening)
    onOpenChange(false);
  }

  /* -------------------- UI -------------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : cleanupAndClose("ended"))}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {status === "ringing" && (
              <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(dialSeconds)}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* REMOTE */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={remoteRef} className="h-full w-full object-cover" />
            {status !== "connected" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
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
