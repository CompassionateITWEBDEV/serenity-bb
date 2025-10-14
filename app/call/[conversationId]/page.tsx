"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, RefreshCw } from "lucide-react";

/**
 * Env-driven ICE; add these to .env(.local)
 * NEXT_PUBLIC_ICE_STUN=stun:stun.l.google.com:19302
 * NEXT_PUBLIC_ICE_TURN_URI=turns:YOUR_TURN_HOST:5349
 * NEXT_PUBLIC_ICE_TURN_USER=turn_user
 * NEXT_PUBLIC_ICE_TURN_PASS=turn_pass
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
  const [authChecked, setAuthChecked] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const threadChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ---------- Auth guard that won't bounce prematurely ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try session first (faster/more reliable across tabs)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        if (!cancelled) {
          const u = sessionData.session.user;
          setMe({ id: u.id, name: u.email || "Me" });
          setAuthChecked(true);
        }
        return;
      }
      // Fallback to getUser (may refresh)
      const { data: au } = await supabase.auth.getUser();
      if (au.user) {
        if (!cancelled) {
          setMe({ id: au.user.id, name: au.user.email || "Me" });
          setAuthChecked(true);
        }
        return;
      }
      // One last gentle refresh attempt before redirecting
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session?.user) {
        if (!cancelled) {
          const u = refreshed.session.user;
          setMe({ id: u.id, name: u.email || "Me" });
          setAuthChecked(true);
        }
      } else {
        if (!cancelled) {
          setAuthChecked(true);
          router.push("/login");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // ---------- WebRTC: create peer connection ----------
  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (e) => {
      if (e.candidate && me?.id) {
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: e.candidate.toJSON() });
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

    pcRef.current = pc;
    return pc;
  }, [me?.id]);

  // ---------- Signaling: thread channel for SDP/ICE ----------
  const threadChannelName = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!threadChanRef.current) return;
    void threadChanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannelName, { config: { broadcast: { ack: true } } });

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
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          /* ignore */
        }
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });

    ch.subscribe();
    threadChanRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      threadChanRef.current = null;
    };
  }, [conversationId, threadChannelName, ensurePC, me?.id, sendSignal]);

  // ---------- User channel: invite/bye to trigger IncomingCallBanner ----------
  const userChannelName = useMemo(
    () => (peerUserId ? `user_${peerUserId}` : null),
    [peerUserId]
  );

  async function ensureSubscribedFor(userChannel: ReturnType<typeof supabase.channel>) {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("subscribe timeout")), 10000);
      userChannel.subscribe((s) => {
        if (s === "SUBSCRIBED") { clearTimeout(to); resolve(); }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(to); reject(new Error(String(s))); }
      });
    });
  }

  const sendInvite = useCallback(async () => {
    if (!userChannelName || !me?.id || !conversationId) return;
    const ch = supabase.channel(userChannelName, { config: { broadcast: { ack: true } } });
    await ensureSubscribedFor(ch);
    await ch.send({
      type: "broadcast",
      event: "invite",
      payload: {
        conversationId,
        fromId: me.id,
        fromName: me.name || "Caller",
        mode,
      },
    });
    try { supabase.removeChannel(ch); } catch {}
  }, [conversationId, me?.id, me?.name, mode, userChannelName]);

  const sendByeUser = useCallback(async () => {
    if (!userChannelName || !conversationId) return;
    const ch = supabase.channel(userChannelName, { config: { broadcast: { ack: true } } });
    await ensureSubscribedFor(ch);
    await ch.send({ type: "broadcast", event: "bye", payload: { conversationId } });
    try { supabase.removeChannel(ch); } catch {}
  }, [conversationId, userChannelName]);

  // ---------- Start local media & call flow ----------
  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  const startCall = useCallback(async () => {
    if (!me?.id) return;
    setStatus("connecting");

    // Get local media
    localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    if (role === "caller") {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });

      // also ring via user channel so peer sees IncomingCallBanner
      await sendInvite();
    }
  }, [ensurePC, getConstraints, me?.id, mode, role, sendSignal, sendInvite]);

  // Prepare streams immediately; auto-start if caller
  useEffect(() => {
    if (!me?.id || !authChecked) return;
    (async () => {
      // Prepare local stream early to reduce answer/offer latency
      localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

      if (role === "caller") await startCall();
      else setStatus("connecting");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, authChecked]);

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
      (await (navigator.mediaDevices as any).getDisplayMedia?.({ video: true, audio: true }).catch(() => null)) || null;
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
      try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;

      // tell peer via thread signal (for safety) and via user channel (to hide banner)
      if (!remote && me?.id) {
        sendSignal({ kind: "bye", from: me.id });
        void sendByeUser();
      }
    },
    [me?.id, sendSignal, sendByeUser]
  );

  // Cleanup on tab close
  useEffect(() => {
    const onUnload = () => { endCall(false); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [endCall]);

  if (!authChecked) {
    return (
      <div className="grid min-h-screen place-content-center text-sm text-gray-500">
        Preparing call…
      </div>
    );
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
