"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, RefreshCw } from "lucide-react";

// ---- Env-driven ICE; add these to .env(.local) ----
// NEXT_PUBLIC_ICE_STUN=stun:stun.l.google.com:19302
// NEXT_PUBLIC_ICE_TURN_URI=turns:YOUR_TURN_HOST:5349
// NEXT_PUBLIC_ICE_TURN_USER=turn_user
// NEXT_PUBLIC_ICE_TURN_PASS=turn_pass

function buildIceServers(): RTCIceServer[] {
  const stun = process.env.NEXT_PUBLIC_ICE_STUN || "stun:stun.l.google.com:19302";
  const turn = process.env.NEXT_PUBLIC_ICE_TURN_URI || "";
  const user = process.env.NEXT_PUBLIC_ICE_TURN_USER || "";
  const pass = process.env.NEXT_PUBLIC_ICE_TURN_PASS || "";
  const servers: RTCIceServer[] = [{ urls: [stun] }];
  if (turn && user && pass) servers.push({ urls: [turn], username: user, credential: pass });
  return servers;
}

type SigPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

export default function CallPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const role = (sp.get("role") || "caller") as "caller" | "callee";
  const mode = (sp.get("mode") || "audio") as "audio" | "video";
  const peerUserId = sp.get("peer") || "";
  const peerName = decodeURIComponent(sp.get("peerName") || "Peer");

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Auth (patient or staff; we only need user id)
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      setMe({ id: uid, name: au.user?.email || "Me" });
    })();
  }, [router]);

  // Setup media + peer connection
  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ kind: "webrtc-ice", from: me?.id || "unknown", candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") setStatus("ended");
    };
    pc.ontrack = (ev) => {
      // Why: new remote track added separately on renegotiations
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
    pcRef.current = pc;
    return pc;
  }, [me?.id]);

  // Signaling (Supabase channel)
  const channelName = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!chanRef.current) return;
    void chanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;
    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;
      if (msg.kind === "webrtc-offer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        const pc = ensurePC();
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* ignore */ }
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });
    ch.subscribe();
    chanRef.current = ch;
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [conversationId, channelName, ensurePC, me?.id, sendSignal]);

  // Start flow
  const startCall = useCallback(async () => {
    if (!me?.id) return;
    setStatus("connecting");
    // Local media
    localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    if (role === "caller") {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
    }
  }, [ensurePC, getConstraints, me?.id, mode, role, sendSignal]);

  // Callee auto-prepare streams when page opens
  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      if (role === "caller") await startCall();
      else setStatus("connecting");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOff((v) => !v);
  }, []);

  const shareScreen = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const ds: any = await (navigator.mediaDevices as any).getDisplayMedia?.({ video: true, audio: true }).catch(() => null);
    if (!ds) return;
    // Why: replace only video sender; keeps audio continuity
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender && ds.getVideoTracks()[0]) {
      await sender.replaceTrack(ds.getVideoTracks()[0]);
    }
    ds.getVideoTracks()[0].addEventListener("ended", async () => {
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam && sender) await sender.replaceTrack(cam);
    });
  }, []);

  const endCall = useCallback((remote = false) => {
    setStatus("ended");
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;
    if (!remote) sendSignal({ kind: "bye", from: me?.id || "unknown" });
  }, [me?.id, sendSignal]);

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-rows-[auto_1fr_auto] gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {role} • {mode} • {status}
        </div>
        <div className="text-sm font-medium">{peerName}</div>
      </div>

      <Card className="relative flex items-center justify-center overflow-hidden rounded-xl">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full bg-black object-contain"
        />
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-3 right-3 h-32 w-48 rounded-lg bg-black/70 object-cover ring-2 ring-white/70"
        />
      </Card>

      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={toggleMute} className="rounded-full">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button variant="secondary" onClick={toggleCamera} className="rounded-full" disabled={mode === "audio"}>
          {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        <Button variant="secondary" onClick={shareScreen} className="rounded-full" disabled={mode === "audio"}>
          <MonitorUp className="h-5 w-5" />
        </Button>
        <Button variant="secondary" onClick={startCall} className="rounded-full" title="Renegotiate">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="destructive" onClick={() => endCall(false)} className="rounded-full">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
