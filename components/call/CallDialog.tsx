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
  role: CallRole; // "caller" starts with offer, "callee" waits
  mode: CallMode;

  meId: string;
  meName: string;

  peerUserId: string; // 🔴 REQUIRED
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
  const { open, onOpenChange, conversationId, role, mode, meId, peerUserId, peerName } = props;

  const [status, setStatus] = React.useState<
    "ringing" | "connecting" | "connected" | "ended" | "failed" | "missed"
  >(role === "caller" ? "ringing" : "connecting");
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(mode === "audio");
  const [dialSeconds, setDialSeconds] = React.useState(0);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);
  const subRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);
  const closingRef = React.useRef(false); // prevent double close

  // -------- helpers --------
  function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
  }

  async function getUserStream(m: CallMode) {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: m === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      throw new Error(
        "Could not access microphone/camera. Please allow permissions and ensure no other app is using them."
      );
    }
  }

  function dialSecondsSet(next: number | ((v: number) => number)) {
    setDialSeconds((prev) => (typeof next === "function" ? (next as any)(prev) : next));
  }

  function startDialTimer() {
    stopDialTimer();
    dialSecondsSet(0);
    dialTickRef.current = window.setInterval(() => dialSecondsSet((v) => v + 1), 1000) as any;
    dialTimerRef.current = window.setTimeout(async () => {
      if (!answeredRef.current) {
        setStatus("missed");
        await safeHangup();
        cleanup("missed");
      }
    }, 5 * 60 * 1000) as any; // 5 min
  }

  function stopDialTimer() {
    if (dialTickRef.current) {
      clearInterval(dialTickRef.current);
      dialTickRef.current = null;
    }
    if (dialTimerRef.current) {
      clearTimeout(dialTimerRef.current);
      dialTimerRef.current = null;
    }
  }

  async function safeHangup() {
    try {
      await sendHangupToUser(peerUserId, conversationId);
    } catch {}
  }

  function cleanup(final: "ended" | "failed" | "missed") {
    if (closingRef.current) return;
    closingRef.current = true;

    stopDialTimer();
    setStatus(final);

    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.getReceivers().forEach((r) => r.track?.stop());
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

    // we purposely do not remove the shared channel instance here
    onOpenChange(false);
  }

  async function closeByUser() {
    await safeHangup();
    cleanup("ended");
  }

  // -------- OPEN/CLOSE lifecycle --------
  React.useEffect(() => {
    if (!open) return;

    closingRef.current = false;

    (async () => {
      setStatus(role === "caller" ? "ringing" : "connecting");

      // 1) Get local media first (prevents “open-close-open” flicker)
      const stream = await getUserStream(mode);
      localStreamRef.current = stream;
      attachStream(localRef.current, stream, true);

      // 2) Build RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // 3) Add local tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 4) Prepare remote stream
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachStream(remoteRef.current, remoteStream, false);
      pc.addEventListener("track", (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      });

      // 5) ICE
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await sendIceToUser(peerUserId, {
            conversationId,
            fromId: meId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      // 6) State
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          answeredRef.current = true;
          setStatus("connected");
          stopDialTimer();
        } else if (s === "failed" || s === "disconnected") {
          setTimeout(() => {
            if (!pcRef.current) return;
            if (pcRef.current.connectionState === "failed" || pcRef.current.connectionState === "disconnected") {
              cleanup("failed");
            }
          }, 2000);
        }
      };

      // 7) Subscribe for SDP/ICE
      const sub = userRingChannel(meId);
      subRef.current = sub;

      sub.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId || !pcRef.current) return;
        if (p?.sdp?.type === "answer") {
          await pcRef.current.setRemoteDescription(p.sdp);
        }
      });

      sub.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
        if (role !== "callee") return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId || !pcRef.current) return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: ans });
          setStatus("connecting");
        } catch {
          cleanup("failed");
        }
      });

      sub.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId || !pcRef.current) return;
        try {
          await pcRef.current.addIceCandidate(p.candidate);
        } catch {
          // ignore if already closed
        }
      });

      sub.on("broadcast", { event: "hangup" }, (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId && p.conversationId !== conversationId) return;
        cleanup("ended");
      });

      sub.subscribe();

      // 8) Caller sends offer
      if (role === "caller") {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video",
        });
        await pc.setLocalDescription(offer);
        await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
        startDialTimer();
      }
    })().catch(() => {
      cleanup("failed");
    });

    return () => {
      // component unmount or open -> false handled by closeByUser/cleanup via onOpenChange
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // -------- Controls (mute/camera) --------
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

  // -------- render --------
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : closeByUser())}>
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
          {/* Remote */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={remoteRef} playsInline autoPlay className="h-full w-full object-cover" />
            {status !== "connected" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
          </div>

          {/* Local */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={localRef} playsInline autoPlay muted className="h-full w-full object-cover" />
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

          <Button variant="destructive" onClick={closeByUser} className="rounded-full">
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
