// @/components/call/CallDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Tv, Volume2 } from "lucide-react";
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
  role: CallRole;            // "caller" starts with offer, "callee" waits for offer
  mode: CallMode;

  meId: string;
  meName: string;

  peerUserId: string;        // <— IMPORTANT: pass this!
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
  const { open, onOpenChange, conversationId, role, mode, meId, meName, peerUserId, peerName } = props;

  const [status, setStatus] = React.useState<"ringing" | "connecting" | "connected" | "ended" | "failed" | "missed">(
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
  const subRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);

  // OPEN/CLOSE lifecycle
  React.useEffect(() => {
    if (!open) {
      cleanup("ended");
      return;
    }
    (async () => {
      setStatus(role === "caller" ? "ringing" : "connecting");
      const stream = await getUserStream(mode);
      localStreamRef.current = stream;
      attachStream(localRef.current, stream, true);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // add tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // remote
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachStream(remoteRef.current, remoteStream, false);
      pc.addEventListener("track", (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      });

      // trickle ICE
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await sendIceToUser(peerUserId, {
            conversationId,
            fromId: meId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      // connection state
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          answeredRef.current = true;
          setStatus("connected");
          stopDialTimer();
        } else if (s === "failed" || s === "disconnected") {
          // give a moment for ICE restarts; otherwise end
          setTimeout(() => {
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
              cleanup("failed");
            }
          }, 2500);
        }
      };

      // Subscribe to my own user channel for SDP/ICE from the peer
      const sub = userRingChannel(meId);
      subRef.current = sub;

      sub.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current) return;
        if (p?.sdp?.type === "answer") {
          await pcRef.current.setRemoteDescription(p.sdp);
        }
      });

      sub.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
        // callee path: receive offer here
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current || role !== "callee") return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          await sendAnswerToUser(peerUserId, {
            conversationId,
            fromId: meId,
            sdp: ans,
          });
          setStatus("connecting");
        } catch (e) {
          console.error("[CallDialog] setRemote/calc answer failed:", e);
          cleanup("failed");
        }
      });

      sub.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        if (!pcRef.current) return;
        try {
          await pcRef.current.addIceCandidate(p.candidate);
        } catch (err) {
          // benign if already closed
        }
      });

      sub.on("broadcast", { event: "hangup" }, (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId && p.conversationId !== conversationId) return;
        cleanup("ended");
      });

      sub.subscribe();

      // Caller immediately sends OFFER (after RING that you already send before opening)
      if (role === "caller") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        await sendOfferToUser(peerUserId, {
          conversationId,
          fromId: meId,
          sdp: offer,
        });
        // start 5-minute dial timeout if not answered
        startDialTimer();
      }
    })().catch((e) => {
      console.error("[CallDialog] init failed:", e);
      cleanup("failed");
    });

    return () => {
      // if dialog unmounts while still open, ensure cleanup
      // (onOpenChange(false) also calls cleanup)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Controls (mute/camera)
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

  function startDialTimer() {
    stopDialTimer();
    dialSecondsRefSet(0);
    dialTickRef.current = window.setInterval(() => {
      dialSecondsRefSet((v) => v + 1);
    }, 1000) as unknown as number;
    dialTimerRef.current = window.setTimeout(async () => {
      // If still not answered, hang up as "missed"
      if (!answeredRef.current) {
        setStatus("missed");
        await safeHangup();
        cleanup("missed");
      }
    }, 5 * 60 * 1000) as unknown as number; // 5 minutes
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

  function dialSecondsRefSet(next: number | ((v: number) => number)) {
    setDialSeconds((prev) => (typeof next === "function" ? (next as any)(prev) : next));
  }

  async function safeHangup() {
    try {
      await sendHangupToUser(peerUserId, conversationId);
    } catch {}
  }

  function cleanup(finalStatus: "ended" | "failed" | "missed") {
    stopDialTimer();
    setStatus(finalStatus);
    // close pc
    try {
      pcRef.current?.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {}
      });
      pcRef.current?.getReceivers().forEach((r) => {
        try {
          r.track?.stop();
        } catch {}
      });
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    // stop streams
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    // unsubscribe
    try {
      if (subRef.current) {
        // supabase-js v2: we remove channel via supabase.removeChannel()
        // BUT subRef is the channel instance from userRingChannel; removing here may disrupt other listeners if shared.
        // So do nothing (we didn't call supabase.removeChannel on shared). We simply stop listening by closing the dialog.
      }
    } catch {}

    // close dialog
    onOpenChange(false);
  }

  async function onHangupClick() {
    await safeHangup();
    cleanup("ended");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <video ref={remoteRef} playsInline autoPlay className="h-full w-full object-cover" />
            {status !== "connected" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
          </div>

          {/* LOCAL */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={localRef} playsInline autoPlay muted className="h-full w-full object-cover" />
            {camOff && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Camera off</div>
            )}
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

          <Button variant="destructive" onClick={onHangupClick} className="rounded-full">
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        {status === "missed" && (
          <p className="mt-2 text-center text-sm text-gray-500">No answer. Call timed out after 5 minutes.</p>
        )}
      </DialogContent>
    </Dialog>
  );

  /* ---------------- helpers ---------------- */

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
        "Could not access microphone/camera. Please allow permissions (and ensure no other app is using them)."
      );
    }
  }
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
