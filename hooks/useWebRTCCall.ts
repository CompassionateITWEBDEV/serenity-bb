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
function buildIceServers(turn?: { urls: string[]; username?: string; credential?: string }): RTCIceServer[] {
  const stun = process.env.NEXT_PUBLIC_ICE_STUN || "stun:stun.l.google.com:19302";
  const envTurn = process.env.NEXT_PUBLIC_ICE_TURN_URI || "";
  const envUser = process.env.NEXT_PUBLIC_ICE_TURN_USER || "";
  const envPass = process.env.NEXT_PUBLIC_ICE_TURN_PASS || "";

  const servers: RTCIceServer[] = [{ urls: [stun] }];
  
  // Use provided turn config or fallback to env vars
  if (turn?.urls && turn.urls.length > 0) {
    servers.push({ urls: turn.urls, username: turn.username, credential: turn.credential });
  } else if (envTurn && envUser && envPass) {
    servers.push({ urls: [envTurn], username: envUser, credential: envPass });
  }
  
  return servers;
}

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

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
  open,
  conversationId,
  role,
  mode = "video",
  meId,
  peerUserId,
  turn,
  onStatus,
}: {
  open: boolean;
  conversationId: string;
  role: CallRole;
  mode?: CallMode;
  meId: string;
  peerUserId: string;
  turn?: { urls: string[]; username?: string; credential?: string };
  onStatus?: (
    s: "idle" | "ringing" | "connecting" | "connected" | "missed" | "ended" | "failed"
  ) => void;
}) {
  const [status, setStatus] = useState<"idle" | "ringing" | "connecting" | "connected" | "missed" | "ended" | "failed">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const [netOffline, setNetOffline] = useState(false);
  const [stunOk, setStunOk] = useState<boolean | null>(null);
  const [turnOk, setTurnOk] = useState<boolean | null>(null);
  const [usingRelayOnly, setUsingRelayOnly] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dialSeconds, setDialSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dialTimerRef = useRef<NodeJS.Timeout | null>(null);

  const channelName = useMemo(() => `thread_${conversationId}`, [conversationId]);

  // Ref setters
  const setLocalVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    localVideoRef.current = ref;
    if (ref && localStreamRef.current) {
      ref.srcObject = localStreamRef.current;
    }
  }, []);

  const setRemoteVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    remoteVideoRef.current = ref;
    if (ref && remoteStreamRef.current) {
      ref.srcObject = remoteStreamRef.current;
    }
  }, []);

  const setRemoteAudioRef = useCallback((ref: HTMLAudioElement | null) => {
    remoteAudioRef.current = ref;
    if (ref && remoteStreamRef.current) {
      ref.srcObject = remoteStreamRef.current;
    }
  }, []);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!chanRef.current) return;
    void chanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers(turn) });

    pc.onicecandidate = (e) => {
      if (e.candidate && meId) {
        sendSignal({ kind: "webrtc-ice", from: meId, candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setStatus("connected");
        onStatus?.("connected");
      }
      if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus("ended");
        onStatus?.("ended");
        cleanupMedia();
      }
    };

    pc.ontrack = (ev) => {
      console.log(`useWebRTCCall: Received remote ${ev.track.kind} track:`, ev.track.label);
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
    };

    pcRef.current = pc;
    return pc;
  }, [meId, turn, sendSignal, onStatus]);

  // subscribe signaling
  useEffect(() => {
    if (!meId || !conversationId || !open) return;

    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === meId) return;

      const pc = ensurePC();

      if (msg.kind === "webrtc-offer") {
        setStatus("connecting");
        onStatus?.("connecting");
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        console.log('useWebRTCCall: Created answer with audio:', answer.sdp?.includes('m=audio'));
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "webrtc-answer", from: meId, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      } else if (msg.kind === "bye") {
        hangup();
      }
    });

    ch.subscribe();
    chanRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      chanRef.current = null;
    };
  }, [conversationId, channelName, ensurePC, meId, sendSignal, open, onStatus]);

  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      }, 
      video: mode === "video" ? { 
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      } : false 
    };
  }, [mode]);

  const start = useCallback(async () => {
    if (!meId || !open) return;

    try {
      setStatus("ringing");
      onStatus?.("ringing");
      
      // Start dial timer
      dialTimerRef.current = setInterval(() => {
        setDialSeconds(prev => prev + 1);
      }, 1000);

      // 1) Local media
      localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
      console.log('useWebRTCCall: Media stream acquired:', {
        audioTracks: localStreamRef.current.getAudioTracks().length,
        videoTracks: localStreamRef.current.getVideoTracks().length,
        audioTrackLabels: localStreamRef.current.getAudioTracks().map(t => t.label),
        videoTrackLabels: localStreamRef.current.getVideoTracks().map(t => t.label)
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

      // 2) PC + add tracks
      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((t) => {
        console.log(`useWebRTCCall: Adding ${t.kind} track to peer connection:`, t.label);
        pc.addTrack(t, localStreamRef.current!);
      });

      // 3) Caller → create & send offer
      if (role === "caller") {
        setStatus("connecting");
        onStatus?.("connecting");
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        console.log('useWebRTCCall: Created offer with audio:', offer.sdp?.includes('m=audio'));
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: meId, sdp: offer });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setMediaError(error instanceof Error ? error.message : "Failed to access media devices");
      setStatus("failed");
      onStatus?.("failed");
    }
  }, [ensurePC, getConstraints, meId, mode, role, sendSignal, open, onStatus]);

  // auto-start when open and meId is ready
  useEffect(() => {
    if (!meId || !open) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, open]);

  const setMutedState = useCallback((muted: boolean) => {
    const s = localStreamRef.current;
    if (s) {
      s.getAudioTracks().forEach((t) => (t.enabled = !muted));
    }
    setMuted(muted);
  }, []);

  const setCamOffState = useCallback((camOff: boolean) => {
    const s = localStreamRef.current;
    if (s) {
      s.getVideoTracks().forEach((t) => (t.enabled = !camOff));
    }
    setCamOff(camOff);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState(!muted);
  }, [muted, setMutedState]);

  const toggleCamera = useCallback(() => {
    setCamOffState(!camOff);
  }, [camOff, setCamOffState]);

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

    // Clear dial timer
    if (dialTimerRef.current) {
      clearInterval(dialTimerRef.current);
      dialTimerRef.current = null;
    }
  };

  const hangup = useCallback(() => {
    setStatus("ended");
    onStatus?.("ended");
    cleanupMedia();
    if (meId) {
      sendSignal({ kind: "bye", from: meId });
      // optional courtesy ping to peer's user channel
      if (peerUserId) {
        const c = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
        ensureSubscribedFor(c)
          .then(() => c.send({ type: "broadcast", event: "bye", payload: { conversationId } }))
          .catch(() => {});
      }
    }
  }, [conversationId, meId, peerUserId, sendSignal, onStatus]);

  const endCall = useCallback((remote = false) => {
    setStatus("ended");
    onStatus?.("ended");
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
  }, [conversationId, meId, peerUserId, sendSignal, onStatus]);

  // cleanup on unmount
  useEffect(() => () => cleanupMedia(), []);

  return {
    // state object
    state: {
      status,
      muted,
      camOff,
      netOffline,
      stunOk,
      turnOk,
      usingRelayOnly,
      mediaError,
      dialSeconds,
    },

    // ref setters
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,

    // controls
    setMuted: setMutedState,
    setCamOff: setCamOffState,
    hangup,

    // legacy refs (for backward compatibility)
    localVideoRef,
    remoteVideoRef,

    // additional controls
    start,
    endCall,
    toggleMute,
    toggleCamera,
    shareScreen,
  };
}
