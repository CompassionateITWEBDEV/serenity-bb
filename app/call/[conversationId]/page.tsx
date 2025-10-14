"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, RefreshCw } from "lucide-react";

/**
 * ICE configuration (env)
 *  - NEXT_PUBLIC_ICE_STUN=stun:stun.l.google.com:19302
 *  - NEXT_PUBLIC_ICE_TURN_URI=turns:YOUR_TURN_HOST:5349
 *  - NEXT_PUBLIC_ICE_TURN_USER=turn_user
 *  - NEXT_PUBLIC_ICE_TURN_PASS=turn_pass
 */
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

export default function CallRoomPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();
  const router = useRouter();

  const role = (qs.get("role") as "caller" | "callee") || "caller";
  const mode = (qs.get("mode") as "audio" | "video") || "audio";
  const peer = qs.get("peer") || "";
  const peerName = decodeURIComponent(qs.get("peerName") || "Peer");

  const [me, setMe] = useState<{ id: string; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Supabase channel for signaling
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelName = useMemo(() => `thread_${conversationId}`, [conversationId]);

  // ---------- Auth gate (client-only) ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (!data.session) {
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
        return;
      }
      setMe({ id: data.session.user.id, email: data.session.user.email });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // ---------- Helpers ----------
  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    // ========== pc1 sample style events ==========
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ kind: "webrtc-ice", from: me?.id || "unknown", candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") setStatus("ended");
    };

    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    // pc1-like auto renegotiation hook
    pc.onnegotiationneeded = async () => {
      try {
        if (role !== "caller") return; // caller drives initial renegotiations
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: me?.id || "unknown", sdp: offer });
      } catch (e) {
        console.warn("[webrtc] negotiation error", e);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id, mode, role]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!chanRef.current) return;
    void chanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  // ---------- Signaling channel ----------
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || !me?.id || msg.from === me.id) return;

      // Ensure PC exists for inbound messages
      const pc = ensurePC();

      if (msg.kind === "webrtc-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          /* ignore bad ICE */
        }
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });
    ch.subscribe();
    chanRef.current = ch;
    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [conversationId, channelName, ensurePC, me?.id, sendSignal]);

  // ---------- Local media + initial dial ----------
  const addLocalTracks = useCallback(async () => {
    const pc = ensurePC();
    localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
  }, [ensurePC, getConstraints]);

  const startCall = useCallback(async () => {
    const pc = ensurePC();
    setStatus("connecting");
    if (!localStreamRef.current) {
      await addLocalTracks();
    }
    // caller creates initial offer (callee will answer on receive)
    if (role === "caller") {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me?.id || "unknown", sdp: offer });
    } else {
      // callee already added tracks; just wait for offer
      setStatus("connecting");
    }
  }, [addLocalTracks, ensurePC, me?.id, mode, role, sendSignal]);

  useEffect(() => {
    if (loading || !me) return;
    (async () => {
      await addLocalTracks();
      if (role === "caller") {
        await startCall();
      } else {
        setStatus("connecting"); // waiting for offer
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, me?.id]);

  // ---------- Controls ----------
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
    if (!pc || mode === "audio") return;
    const ds: MediaStream | null =
      // @ts-expect-error Safari type
      (await (navigator.mediaDevices as any).getDisplayMedia?.({ video: true, audio: true }).catch(() => null)) ?? null;
    if (!ds) return;
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender && ds.getVideoTracks()[0]) {
      await sender.replaceTrack(ds.getVideoTracks()[0]);
    }
    ds.getVideoTracks()[0].addEventListener("ended", async () => {
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam && sender) await sender.replaceTrack(cam);
    });
  }, [mode]);

  const endCall = useCallback(
    (remote = false) => {
      setStatus("ended");
      try {
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      } catch {}
      try {
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;

      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;

      if (!remote) {
        sendSignal({ kind: "bye", from: me?.id || "unknown" });
      }

      // Back to Messages
      router.push("/dashboard/messages");
    },
    [me?.id, router, sendSignal]
  );

  if (loading) {
    return <div className="p-6">Joining the call…</div>;
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-rows-[auto_1fr_auto] gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {role} • {mode} • {status}
        </div>
        <div className="text-sm font-medium">{peerName}</div>
      </div>

      <Card className="relative flex items-center justify-center overflow-hidden rounded-xl">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full bg-black object-contain" />
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
        <Button variant="secondary" onClick={startCall} className="rounded-full" title="Renegotiate / Reconnect">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="destructive" onClick={() => endCall(false)} className="rounded-full">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
