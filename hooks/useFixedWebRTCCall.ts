"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  createFixedPeerConnection, 
  createFixedOffer, 
  createFixedAnswer, 
  setLocalDescriptionSafely, 
  setRemoteDescriptionSafely, 
  addIceCandidateSafely,
  resetPeerConnection,
  createNewPeerConnection,
  FixedWebRTCHandler,
  type WebRTCConfig,
  type SDPConstraints
} from "@/lib/webrtc/webrtc-fix";

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

export function useFixedWebRTCCall({
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

  const webrtcHandlerRef = useRef<FixedWebRTCHandler | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const channelName = useMemo(() => `thread_${conversationId}`, [conversationId]);

  // WebRTC configuration
  const webrtcConfig: WebRTCConfig = useMemo(() => ({
    iceServers: buildIceServers(turn),
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  }), [turn]);

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

  // Get or create WebRTC handler
  const getWebRTCHandler = useCallback(() => {
    if (!webrtcHandlerRef.current) {
      webrtcHandlerRef.current = new FixedWebRTCHandler(webrtcConfig);
    }
    return webrtcHandlerRef.current;
  }, [webrtcConfig]);

  // Get or create peer connection
  const ensurePC = useCallback(() => {
    const handler = getWebRTCHandler();
    let pc = handler.getPeerConnection();
    
    if (!pc) {
      pc = createNewPeerConnection(webrtcConfig);
      handler['pc'] = pc; // Access private property for initialization
    }

    // Set up event handlers
    pc.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', pc?.connectionState);
      if (pc?.connectionState === 'connected') {
        setStatus("connected");
        onStatus?.("connected");
        // Clear any connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      } else if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
        setStatus("failed");
        onStatus?.("failed");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE connection state:', pc?.iceConnectionState);
      if (pc?.iceConnectionState === 'connected' || pc?.iceConnectionState === 'completed') {
        setStatus("connected");
        onStatus?.("connected");
        // Clear any connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      } else if (pc?.iceConnectionState === 'failed') {
        setStatus("failed");
        onStatus?.("failed");
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      }
    };

    return pc;
  }, [getWebRTCHandler, webrtcConfig, onStatus]);

  // Send signal function
  const sendSignal = useCallback(async (payload: SigPayload) => {
    try {
      const ch = chanRef.current;
      if (!ch) return;
      
      await ch.send({
        type: "broadcast",
        event: "signal",
        payload
      });
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  }, []);

  // Get media constraints
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

  // Start call function
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
      console.log('FixedWebRTCCall: Media stream acquired:', {
        audioTracks: localStreamRef.current.getAudioTracks().length,
        videoTracks: localStreamRef.current.getVideoTracks().length,
        audioTrackLabels: localStreamRef.current.getAudioTracks().map(t => t.label),
        videoTrackLabels: localStreamRef.current.getVideoTracks().map(t => t.label)
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

      // 2) PC + add tracks
      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((t) => {
        console.log(`FixedWebRTCCall: Adding ${t.kind} track to peer connection:`, t.label);
        pc.addTrack(t, localStreamRef.current!);
      });

      // 3) Caller → create & send offer
      if (role === "caller") {
        setStatus("connecting");
        onStatus?.("connecting");
        
        // Set connection timeout (30 seconds)
        connectionTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ Connection timeout - call taking too long to establish');
          setStatus("failed");
          onStatus?.("failed");
        }, 30000);
        
        const handler = getWebRTCHandler();
        const constraints: SDPConstraints = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video"
        };
        
        const offer = await handler.createOffer(constraints);
        console.log('FixedWebRTCCall: Created offer with audio:', offer.sdp?.includes('m=audio'));
        console.log('FixedWebRTCCall: Created offer with video:', offer.sdp?.includes('m=video'));
        
        await handler.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: meId, sdp: offer });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setMediaError(error instanceof Error ? error.message : "Failed to access media devices");
      setStatus("failed");
      onStatus?.("failed");
    }
  }, [ensurePC, getConstraints, meId, mode, role, sendSignal, open, onStatus, getWebRTCHandler]);

  // Signal handling
  useEffect(() => {
    if (!meId || !conversationId || !open) return;

    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === meId) return;

      const handler = getWebRTCHandler();
      const pc = ensurePC();

      try {
        if (msg.kind === "webrtc-offer") {
          console.log('📞 Received offer from peer, answering...');
          setStatus("connecting");
          onStatus?.("connecting");
          
          // Set connection timeout (30 seconds)
          connectionTimeoutRef.current = setTimeout(() => {
            console.warn('⚠️ Connection timeout - call taking too long to establish');
            setStatus("failed");
            onStatus?.("failed");
          }, 30000);
          
          // Ensure we have local media
          if (!localStreamRef.current) {
            console.log('🎥 Getting local media stream for callee...');
            localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
            console.log('✅ Local media stream acquired for callee:', {
              audioTracks: localStreamRef.current.getAudioTracks().length,
              videoTracks: localStreamRef.current.getVideoTracks().length,
              streamId: localStreamRef.current.id
            });
            
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            // Add tracks to peer connection
            localStreamRef.current.getTracks().forEach((t) => {
              console.log(`Adding ${t.kind} track to peer connection:`, t.label);
              pc.addTrack(t, localStreamRef.current!);
            });
          }
          
          // Set remote description and create answer
          await handler.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          
          const constraints: SDPConstraints = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video"
          };
          
          const answer = await handler.createAnswer(constraints);
          console.log('FixedWebRTCCall: Created answer with audio:', answer.sdp?.includes('m=audio'));
          console.log('FixedWebRTCCall: Created answer with video:', answer.sdp?.includes('m=video'));
          
          await handler.setLocalDescription(answer);
          sendSignal({ kind: "webrtc-answer", from: meId, sdp: answer });
          console.log('✅ Answer sent to peer - connection should establish now');
          
        } else if (msg.kind === "webrtc-answer") {
          console.log('📞 Received answer from peer...');
          await handler.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          console.log('✅ Remote description set - connection should establish now');
          
        } else if (msg.kind === "webrtc-ice") {
          await handler.addIceCandidate(msg.candidate);
          
        } else if (msg.kind === "bye") {
          console.log('📞 Received bye from peer...');
          hangup();
        }
      } catch (error) {
        console.error('Error handling signal:', error);
        setStatus("failed");
        onStatus?.("failed");
      }
    });

    ch.subscribe();
    chanRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      chanRef.current = null;
    };
  }, [conversationId, channelName, ensurePC, meId, sendSignal, open, onStatus, getWebRTCHandler, mode, getConstraints]);

  // Auto-start when open and meId is ready
  useEffect(() => {
    if (!meId || !open) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, open]);

  // Media controls
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
    const pc = ensurePC();
    if (!pc || mode === "audio") return;
    
    try {
      const ds: MediaStream | null = await (navigator.mediaDevices as any)
        ?.getDisplayMedia?.({ video: true, audio: true })
        .catch(() => null);
      if (!ds) return;

      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender && ds.getVideoTracks()[0]) {
        await sender.replaceTrack(ds.getVideoTracks()[0]);
      }

      ds.getVideoTracks()[0].addEventListener("ended", async () => {
        const cam = localStreamRef.current?.getVideoTracks()[0];
        if (cam && sender) await sender.replaceTrack(cam);
      });
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  }, [mode, ensurePC]);

  // Cleanup function
  const cleanupMedia = useCallback(() => {
    try { 
      const pc = ensurePC();
      pc.getSenders().forEach((s) => s.track?.stop()); 
    } catch {}
    
    try { 
      const handler = getWebRTCHandler();
      handler.close();
      webrtcHandlerRef.current = null;
    } catch {}

    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;

    try { remoteStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    remoteStreamRef.current = null;

    // Clear timers
    if (dialTimerRef.current) {
      clearInterval(dialTimerRef.current);
      dialTimerRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, [ensurePC, getWebRTCHandler]);

  // Hangup function
  const hangup = useCallback(() => {
    setStatus("ended");
    onStatus?.("ended");
    cleanupMedia();
    if (meId) {
      sendSignal({ kind: "bye", from: meId });
    }
  }, [meId, sendSignal, onStatus, cleanupMedia]);

  // End call function
  const endCall = useCallback((remote = false) => {
    setStatus("ended");
    onStatus?.("ended");
    cleanupMedia();
    if (!remote && meId) {
      sendSignal({ kind: "bye", from: meId });
    }
  }, [meId, sendSignal, onStatus, cleanupMedia]);

  // Cleanup on unmount
  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

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

