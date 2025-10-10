"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { conversationChannel, sendHangupToConversation } from "@/lib/webrtc/signaling";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

async function safePlay(el?: HTMLMediaElement | null) { try { await el?.play?.(); } catch {} }

export type CallRole = "caller" | "callee";
export type CallMode = "audio" | "video";

export default function CallDialog({
  open,
  onOpenChange,
  conversationId,
  role,
  mode,
  meId,
  meName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  role: CallRole;
  mode: CallMode;
  meId: string;
  meName: string;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sigRef = useRef<ReturnType<typeof conversationChannel> | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingICE = useRef<RTCIceCandidateInit[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"connecting" | "in-call" | "ended">("connecting");

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [open]);

  const hhmmss = useMemo(() => {
    const s = elapsed, h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
    return [h,m,ss].map(n => String(n).padStart(2,"0")).join(":");
  }, [elapsed]);

  useEffect(() => {
    if (!open) return;
    let closed = false;

    async function setup() {
      // Media first (avoid renegotiation)
      try {
        const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
        const ms = await navigator.mediaDevices.getUserMedia(mode === "video" ? { audio, video: true } : { audio, video: false });
        localRef.current = ms;
        ms.getAudioTracks().forEach(t => t.enabled = micOn);
        ms.getVideoTracks().forEach(t => t.enabled = camOn);
      } catch (e: any) {
        alert(`Mic/Camera error.\n\n${e?.message ?? ""}`);
        onOpenChange(false);
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
        ],
      });
      pcRef.current = pc;

      // Attach local
      localRef.current!.getTracks().forEach(t => pc.addTrack(t, localRef.current!));
      if (mode === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = localRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        await safePlay(localVideoRef.current);
      }
      if (mode === "audio" && localAudioRef.current) {
        localAudioRef.current.srcObject = localRef.current;
        await safePlay(localAudioRef.current);
      }

      // Remote
      pc.ontrack = async (e) => {
        const [remote] = e.streams;
        if (!remote) return;
        if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = remote; remoteVideoRef.current.playsInline = true; await safePlay(remoteVideoRef.current); }
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = remote; await safePlay(remoteAudioRef.current); }
        setStatus("in-call");
      };
      pc.onconnectionstatechange = () => {
        if (["failed","disconnected","closed"].includes(pc.connectionState)) end();
      };
      pc.onicecandidate = (e) => {
        if (e.candidate && sigRef.current) {
          sigRef.current.send({ type: "broadcast", event: "ice", payload: { conversationId, from: meId, candidate: e.candidate } });
        }
      };

      // Signaling
      const sig = conversationChannel(conversationId, `call-${meId}`);
      sig.on("broadcast", { event: "offer" }, async (p) => {
        const msg = p.payload as any; if (msg.conversationId !== conversationId || role !== "callee") return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        for (const c of pendingICE.current.splice(0)) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        sig.send({ type: "broadcast", event: "answer", payload: { conversationId, from: meId, sdp: ans } });
      });
      sig.on("broadcast", { event: "answer" }, async (p) => {
        const msg = p.payload as any; if (msg.conversationId !== conversationId || role !== "caller") return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        for (const c of pendingICE.current.splice(0)) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      });
      sig.on("broadcast", { event: "ice" }, async (p) => {
        const msg = p.payload as any; if (msg.conversationId !== conversationId || msg.from === meId) return;
        if (!pc.remoteDescription) pendingICE.current.push(msg.candidate);
        else { try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {} }
      });
      sig.on("broadcast", { event: "hangup" }, (p) => {
        const msg = p.payload as any; if (msg.conversationId && msg.conversationId !== conversationId) return;
        end();
      });
      await sig.subscribe();
      sigRef.current = sig;

      // Caller sends offer
      if (role === "caller") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        sig.send({ type: "broadcast", event: "offer", payload: { conversationId, from: meId, sdp: offer, name: meName } });
      }
    }

    function end() {
      if (closed) return;
      closed = true;
      try { sendHangupToConversation(conversationId); } catch {}
      try { sigRef.current && supabase.removeChannel(sigRef.current); } catch {}
      sigRef.current = null;
      try { pcRef.current?.getSenders().forEach(s => s.track?.stop()); pcRef.current?.close(); } catch {}
      pcRef.current = null;
      try { localRef.current?.getTracks().forEach(t => t.stop()); } catch {}
      localRef.current = null;
      setStatus("ended");
      onOpenChange(false);
    }

    setup();
    return () => end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId, role, mode, meId, meName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            {status === "in-call" ? "In call" : "Connecting…"}
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" />{hhmmss}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
          <div className="col-span-2 relative aspect-video overflow-hidden rounded-2xl bg-black">
            {mode === "video" ? (
              <video ref={remoteVideoRef} playsInline className="h-full w-full object-cover" />
            ) : (
              <audio ref={remoteAudioRef} autoPlay className="hidden" />
            )}
            {status !== "in-call" && (
              <div className="absolute inset-0 grid place-items-center text-xs text-white/70">Waiting for peer…</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              {mode === "video" ? (
                <video ref={localVideoRef} muted playsInline className="h-full w-full object-cover opacity-90" />
              ) : (
                <audio ref={localAudioRef} autoPlay muted className="hidden" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border p-2 dark:border-zinc-700">
              <Button
                variant={micOn ? "default" : "secondary"}
                onClick={() => {
                  const next = !micOn; setMicOn(next);
                  // why: user attention – toggling track enable avoids renegotiation
                  const s = (localRef.current); s?.getAudioTracks().forEach(t => t.enabled = next);
                }}
                className="flex-1 rounded-xl"
              >
                {micOn ? <Mic className="mr-1 h-4 w-4" /> : <MicOff className="mr-1 h-4 w-4" />} {micOn ? "Mute" : "Unmute"}
              </Button>
              {mode === "video" && (
                <Button
                  variant={camOn ? "default" : "secondary"}
                  onClick={() => {
                    const next = !camOn; setCamOn(next);
                    const s = (localRef.current); s?.getVideoTracks().forEach(t => t.enabled = next);
                  }}
                  className="flex-1 rounded-xl"
                >
                  {camOn ? <VideoIcon className="mr-1 h-4 w-4" /> : <VideoOff className="mr-1 h-4 w-4" />} {camOn ? "Camera Off" : "Camera On"}
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700">End</Button>
            </div>
            <p className="px-1 text-[11px] text-gray-500">Tip: uses Supabase Realtime for signaling.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
