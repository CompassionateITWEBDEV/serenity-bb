"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { conversationChannel, ensureSubscribed, ICE_SERVERS, type CallMode } from "@/lib/webrtc/signaling";
import { supabase } from "@/lib/supabase/client";

export type CallRole = "caller" | "callee";
export type { CallMode };

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
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sigRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [status, setStatus] = useState<"idle" | "connecting" | "in-call" | "ended">("idle");

  const hhmmss = useCallTimer(open);

  useEffect(() => {
    if (!open) return;

    let ended = false;

    const init = async () => {
      setStatus("connecting");

      // Get media before offer
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
        });
      } catch (e: any) {
        alert(`Camera/Mic error.\n\n${e?.message ?? ""}`);
        onOpenChange(false);
        return;
      }

      // Show local preview
      if (localRef.current && localStreamRef.current) {
        localRef.current.srcObject = localStreamRef.current;
        localRef.current.muted = true;
        await localRef.current.play().catch(() => {});
      }
      // Track enabled flags
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = micOn));
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = camOn));

      // Peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (remoteRef.current) {
          remoteRef.current.srcObject = stream;
          remoteRef.current.play().catch(() => {});
        }
        setStatus("in-call");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          setStatus("ended");
        }
      };

      // Signaling
      const ch = conversationChannel(conversationId);
      sigRef.current = ch;

      ch.on("broadcast", { event: "hangup" }, () => teardown());
      ch.on("broadcast", { event: "sdp" }, async (p) => {
        const msg = p.payload as any;
        if (!pcRef.current || msg.from === meId) return;

        if (msg.kind === "offer") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          await ch.send({ type: "broadcast", event: "sdp", payload: { kind: "answer", from: meId, name: meName, sdp: ans } });
        } else if (msg.kind === "answer") {
          if (!pcRef.current.currentRemoteDescription) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
        }
      });

      ch.on("broadcast", { event: "ice" }, async (p) => {
        const { from, candidate } = (p.payload || {}) as any;
        if (!pcRef.current || from === meId || !candidate) return;
        try { await pcRef.current.addIceCandidate(candidate); } catch {}
      });

      await ensureSubscribed(ch);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          ch.send({ type: "broadcast", event: "ice", payload: { from: meId, candidate: e.candidate } });
        }
      };

      // Caller sends offer
      if (role === "caller") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        await ch.send({ type: "broadcast", event: "sdp", payload: { kind: "offer", from: meId, name: meName, sdp: offer } });
      }
    };

    const teardown = () => {
      if (ended) return;
      ended = true;

      try { sigRef.current?.send({ type: "broadcast", event: "hangup", payload: { from: meId } }); } catch {}
      try { sigRef.current && supabase.removeChannel(sigRef.current); } catch {}
      sigRef.current = null;

      try {
        pcRef.current?.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} });
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;

      try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;

      setStatus("ended");
      onOpenChange(false);
    };

    init();
    return () => teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId, role, mode, meId, meName]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
  };
  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="px-4 py-3">
          <DialogTitle>
            {status === "in-call" ? "In call" : status === "connecting" ? "Connecting…" : "Call"} • {hhmmss}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
          <div className="col-span-2 relative aspect-video overflow-hidden rounded-2xl bg-black">
            <video ref={remoteRef} playsInline className="h-full w-full object-cover" />
            {status !== "in-call" && (
              <div className="absolute inset-0 grid place-items-center text-xs text-white/70">
                Waiting for the other participant…
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video ref={localRef} muted playsInline className="h-full w-full object-cover opacity-90" />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border p-2 dark:border-zinc-700">
              <Button variant={micOn ? "default" : "secondary"} onClick={toggleMic} className="flex-1 rounded-xl">
                {micOn ? "Mute" : "Unmute"}
              </Button>
              {mode === "video" && (
                <Button variant={camOn ? "default" : "secondary"} onClick={toggleCam} className="flex-1 rounded-xl">
                  {camOn ? "Camera Off" : "Camera On"}
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700">
                End
              </Button>
            </div>
            <p className="px-1 text-[11px] text-gray-500">
              Uses Supabase Realtime for signaling. Either peer can initiate; first to send an offer becomes caller.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Small timer hook ---------------- */
function useCallTimer(active: boolean) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active) { setSec(0); return; }
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return useMemo(() => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }, [sec]);
}
