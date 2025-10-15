"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Add in your .env(.local):
 *  NEXT_PUBLIC_ICE_STUN=stun:stun.l.google.com:19302
 *  NEXT_PUBLIC_ICE_TURN_URI=turns:your.turn.host:5349
 *  NEXT_PUBLIC_ICE_TURN_USER=turnuser
 *  NEXT_PUBLIC_ICE_TURN_PASS=turnpass
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

type CallMode = "audio" | "video";
type CallRole = "caller" | "callee";

type SigPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

async function ensureSubscribedFor(ch: ReturnType<typeof supabase.channel>) {
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("subscribe timeout")), 10000);
    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") { clearTimeout(to); resolve(); }
      if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(to); reject(new Error(String(s))); }
    });
  });
}

export function useWebRTCCall({
  conversationId,
  role,
  mode = "video",
  peerUserId,
  onEnded,
}: {
  conversationId: string;
  role: CallRole;
  mode?: CallMode;
  peerUserId?: string;     // used only for a courtesy "bye" ping
  onEnded?: () => void;    // invoked after local end or remote hangup
}) {
  const [meId, setMeId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // auth → get own user id
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setStatus("ended"); onEnded?.(); return; }
      setMeId(data.user.id);
    })();
  }, [onEnded]);

  const channelName = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!chanRef.current) return;
    void chanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (e) => {
      if (e.candidate && meId) {
        sendSignal({ kind: "webrtc-ice", from: meId, candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus("ended");
        cleanupMedia();
        onEnded?.();
      }
    };

    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    pcRef.current = pc;
    return pc;
  }, [meId, onEnded, sendSignal]);

  // subscribe signaling
  useEffect(() => {
    if (!meId || !conversationId) return;

    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === meId) return;

      const pc = ensurePC();

      if (msg.kind === "webrtc-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "webrtc-answer", from: meId, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });

    ch.subscribe();
    chanRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      chanRef.current = null;
    };
  }, [conversationId, channelName, ensurePC, meId, sendSignal]);

  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  const start = useCallback(async () => {
    if (!meId) return;

    setStatus("connecting");

    // 1) Local media
    localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    // 2) PC + add tracks
    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    // 3) Caller → create & send offer
    if (role === "caller") {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: meId, sdp: offer });
    }
  }, [ensurePC, getConstraints, meId, mode, role, sendSignal]);

  // auto-start when meId is ready
  useEffect(() => {
    if (!meId) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

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
    const ds: MediaStream | null = await (navigator.mediaDevices as any)
      ?.getDisplayMedia?.({ video: true, audio: true })
      .catch(() => null);
    if (!ds) return;

    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender && ds.getVideoTracks()[0]) await sender.replaceTrack(ds.getVideoTracks()[0]);

    ds.getVideoTracks()[0].addEventListener("ended", async () => {
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam && sender) await sender.replaceTrack(cam);
    });
  }, [mode]);

  const cleanupMedia = () => {
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;

    try { remoteStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    remoteStreamRef.current = null;
  };

  const endCall = useCallback((remote = false) => {
    setStatus("ended");
    cleanupMedia();
    if (!remote && meId) {
      sendSignal({ kind: "bye", from: meId });
      // optional courtesy ping to peer's user channel
      if (peerUserId) {
        const c = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
        ensureSubscribedFor(c)
          .then(() => c.send({ type: "broadcast", event: "bye", payload: { conversationId } }))
          .catch(() => {});
      }
    }
    onEnded?.();
  }, [conversationId, meId, onEnded, peerUserId, sendSignal]);

  // cleanup on unmount
  useEffect(() => () => cleanupMedia(), []);

  return {
    // refs to attach to <video />
    localVideoRef,
    remoteVideoRef,

    // state
    status,
    muted,
    camOff,

    // controls
    start,
    endCall,
    toggleMute,
    toggleCamera,
    shareScreen,
  };
}
