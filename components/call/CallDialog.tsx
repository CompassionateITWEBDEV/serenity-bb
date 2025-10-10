"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { userRingChannel, sendOfferToUser, sendAnswerToUser, sendIceToUser, sendHangupToUser } from "@/lib/webrtc/signaling";

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

  peerUserId: string;               // required
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
  const [fatalMsg, setFatalMsg] = React.useState<string | null>(null); // ⬅ ADDED

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);
  const subRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);

  // Helper: only user actions should close the dialog
  const closeByUser = React.useCallback(() => onOpenChange(false), [onOpenChange]); // ⬅ ADDED

  React.useEffect(() => {
    if (!open) {
      // do not call onOpenChange here; just ensure cleanup
      cleanupTracksAndPC();
      stopDialTimer();
      return;
    }

    (async () => {
      setFatalMsg(null); // ⬅ ADDED
      setStatus(role === "caller" ? "ringing" : "connecting");

      // get media
      try {
        const stream = await getUserStream(mode);
        localStreamRef.current = stream;
        attachStream(localRef.current, stream, true);
      } catch (e: any) {
        setStatus("failed");
        setFatalMsg(e?.message || "Could not access microphone/camera. Please allow permissions."); // ⬅ ADDED
        return; // keep dialog open; user can close/retry
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // add local tracks
      localStreamRef.current!.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

      // remote sink
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachStream(remoteRef.current, remoteStream, false);
      pc.addEventListener("track", (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      });

      // ICE
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await sendIceToUser(peerUserId, {
            conversationId,
            fromId: meId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      // state
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          answeredRef.current = true;
          setStatus("connected");
          stopDialTimer();
        } else if (s === "failed" || s === "disconnected") {
          // let ICE try; if it stays failed, show failed but keep dialog open
          setTimeout(() => {
            if (!pcRef.current) return;
            if (pcRef.current.connectionState === "failed" || pcRef.current.connectionState === "disconnected") {
              setStatus("failed");
              setFatalMsg("Connection lost."); // ⬅ ADDED
              stopDialTimer();
              // no auto-close here
            }
          }, 2500);
        }
      };

      // signaling
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
        if (role !== "callee") return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        try {
          await pcRef.current!.setRemoteDescription(p.sdp);
          const ans = await pcRef.current!.createAnswer();
          await pcRef.current!.setLocalDescription(ans);
          await sendAnswerToUser(peerUserId, {
            conversationId,
            fromId: meId,
            sdp: ans,
          });
          setStatus("connecting");
        } catch (e) {
          setStatus("failed");
          setFatalMsg("Could not set remote description."); // ⬅ ADDED
        }
      });

      sub.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId) return;
        try {
          await pcRef.current?.addIceCandidate(p.candidate);
        } catch {}
      });

      sub.on("broadcast", { event: "hangup" }, () => {
        setStatus("ended");
        stopDialTimer();
        // keep open so user sees the end status; they can close
      });

      sub.subscribe();

      // caller: create offer
      if (role === "caller") {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
          await pc.setLocalDescription(offer);
          await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
          startDialTimer();
        } catch (e) {
          setStatus("failed");
          setFatalMsg("Failed to start the call."); // ⬅ ADDED
        }
      }
    })();

    return () => {
      // component unmount or `open` becomes false
      cleanupTracksAndPC();
      stopDialTimer();
      try { if (subRef.current) {/* keep shared channel alive elsewhere */} } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // toggle media
  React.useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);
  React.useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [camOff]);

  function startDialTimer() {
    stopDialTimer();
    setDialSeconds(0);
    dialTickRef.current = window.setInterval(() => setDialSeconds((v) => v + 1), 1000) as unknown as number;
    dialTimerRef.current = window.setTimeout(() => {
      if (!answeredRef.current) {
        setStatus("missed");
        // do not auto-close; let user close or retry
      }
    }, 5 * 60 * 1000) as unknown as number;
  }
  function stopDialTimer() {
    if (dialTimerRef.current) { clearTimeout(dialTimerRef.current); dialTimerRef.current = null; }
    if (dialTickRef.current) { clearInterval(dialTickRef.current); dialTickRef.current = null; }
  }

  async function onHangupClick() {
    try { await sendHangupToUser(peerUserId, conversationId); } catch {}
    setStatus("ended");
    closeByUser(); // ⬅ CHANGED: only user-initiated close
  }

  function retry() {                      // ⬅ ADDED
    setFatalMsg(null);
    setStatus(role === "caller" ? "ringing" : "connecting");
    // close & immediately reopen to re-run effect and request devices again
    // parent controls `open`; we toggle it
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 0);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => v ? onOpenChange(true) : closeByUser()}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {status === "ringing" && <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(dialSeconds)}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={remoteRef} playsInline autoPlay className="h-full w-full object-cover" />
            {status !== "connected" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/80 px-4 text-center">
                {fatalMsg || (status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : status === "missed" ? "No answer." : status === "ended" ? "Call ended." : "Waiting…")}
              </div>
            )}
          </div>

          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={localRef} playsInline autoPlay muted className="h-full w-full object-cover" />
            {camOff && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Camera off</div>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <Button variant={muted ? "secondary" : "default"} onClick={() => setMuted((v) => !v)} className="rounded-full">
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {mode === "video" && (
            <Button variant={camOff ? "secondary" : "default"} onClick={() => setCamOff((v) => !v)} className="rounded-full">
              {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}
          <Button variant="destructive" onClick={onHangupClick} className="rounded-full">
            <PhoneOff className="h-5 w-5" />
          </Button>
          {(status === "failed" || status === "missed") && (
            <Button onClick={retry} className="rounded-full">Retry</Button>   {/* ⬅ ADDED */}
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
  }
  async function getUserStream(m: CallMode) {
    const constraints: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: m === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      throw new Error("Microphone/Camera permission is required.");
    }
  }
  function cleanupTracksAndPC() {
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { remoteStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
  }
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
