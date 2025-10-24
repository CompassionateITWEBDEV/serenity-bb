"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Enhanced WebRTC hook with automatic connection and improved reliability
 */
function buildIceServers(turn?: { urls: string[]; username?: string; credential?: string }): RTCIceServer[] {
  const stun = process.env.NEXT_PUBLIC_ICE_STUN || "stun:stun.l.google.com:19302";
  const envTurn = process.env.NEXT_PUBLIC_ICE_TURN_URI || "";
  const envUser = process.env.NEXT_PUBLIC_ICE_TURN_USER || "";
  const envPass = process.env.NEXT_PUBLIC_ICE_TURN_PASS || "";

  const servers: RTCIceServer[] = [{ urls: [stun] }];
  
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
  | { kind: "bye"; from: string }
  | { kind: "call-accepted"; from: string }
  | { kind: "call-declined"; from: string };

export function useAutoWebRTCCall({
  open,
  conversationId,
  role,
  mode = "video",
  meId,
  peerUserId,
  turn,
  onStatus,
  autoConnect = true,
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
  autoConnect?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "ringing" | "connecting" | "connected" | "missed" | "ended" | "failed">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dialSeconds, setDialSeconds] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const channelName = useMemo(() => `call-${conversationId}`, [conversationId]);

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

  // Send signal function
  const sendSignal = useCallback((payload: SigPayload) => {
    if (!chanRef.current) return;
    
    console.log('📤 Sending signal:', payload.kind);
    chanRef.current.send({
      type: "broadcast",
      event: "signal",
      payload
    });
  }, []);

  // Create peer connection with enhanced configuration
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(turn),
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Enhanced ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && meId) {
        console.log('🧊 Sending ICE candidate');
        sendSignal({ kind: "webrtc-ice", from: meId, candidate: event.candidate.toJSON() });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setStatus("connected");
        onStatus?.("connected");
        
        // Clear any timeouts
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Reset connection attempts on successful connection
        setConnectionAttempts(0);
      } else if (pc.connectionState === "failed") {
        console.warn("❌ Connection failed");
        setStatus("failed");
        onStatus?.("failed");
        setIsConnected(false);
        
        // Attempt reconnection if not too many attempts
        if (connectionAttempts < 3) {
          console.log(`🔄 Attempting reconnection (${connectionAttempts + 1}/3)...`);
          setConnectionAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (open && meId) {
              startCall();
            }
          }, 2000 * (connectionAttempts + 1)); // Exponential backoff
        }
      } else if (pc.connectionState === "disconnected") {
        console.warn("⚠️ Connection disconnected");
        setIsConnected(false);
        setStatus("connecting");
        onStatus?.("connecting");
      }
    };

    // ICE connection state monitoring
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setIsConnected(true);
        setStatus("connected");
        onStatus?.("connected");
      } else if (pc.iceConnectionState === "failed") {
        console.warn("❌ ICE connection failed");
        setStatus("failed");
        onStatus?.("failed");
        setIsConnected(false);
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`📡 Received remote ${event.track.kind} track:`, event.track.label);
      
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      
      // Remove existing tracks of the same kind
      const existingTracks = remoteStreamRef.current.getTracks().filter(t => t.kind === event.track.kind);
      existingTracks.forEach(track => {
        remoteStreamRef.current!.removeTrack(track);
        track.stop();
      });
      
      remoteStreamRef.current.addTrack(event.track);
      
      // Setup remote video/audio
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [meId, turn, sendSignal, onStatus, open, connectionAttempts]);

  // Get media stream with enhanced constraints
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setMediaError(null);
      
      const constraints: MediaStreamConstraints = {
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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media stream acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamId: stream.id
      });

      return stream;
    } catch (error) {
      console.error("Failed to get media stream:", error);
      setMediaError("Failed to access camera/microphone. Please check permissions.");
      throw error;
    }
  }, [mode]);

  // Start call with automatic connection
  const startCall = useCallback(async () => {
    if (!meId || !open) return;

    try {
      setStatus("ringing");
      onStatus?.("ringing");
      
      // Start dial timer
      dialTimerRef.current = setInterval(() => {
        setDialSeconds(prev => prev + 1);
      }, 1000);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          console.warn("⚠️ Connection timeout");
          setStatus("failed");
          setMediaError("Connection timeout. Please try again.");
        }
      }, 30000);

      // Get local media
      localStreamRef.current = await getMediaStream();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection:`, track.label);
        pc.addTrack(track, localStreamRef.current!);
      });

      // Create and send offer for caller
      if (role === "caller") {
        setStatus("connecting");
        onStatus?.("connecting");
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video"
        });
        
        console.log('📞 Created offer with audio:', offer.sdp?.includes('m=audio'));
        console.log('📞 Created offer with video:', offer.sdp?.includes('m=video'));
        
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: meId, sdp: offer });
        
        // Send call accepted signal
        sendSignal({ kind: "call-accepted", from: meId });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setMediaError(error instanceof Error ? error.message : "Failed to start call");
      setStatus("failed");
      onStatus?.("failed");
    }
  }, [meId, open, mode, role, getMediaStream, createPeerConnection, sendSignal, onStatus, isConnected]);

  // Answer call for callee
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!meId) return;

    try {
      setStatus("connecting");
      onStatus?.("connecting");
      
      // Get local media if not already available
      if (!localStreamRef.current) {
        localStreamRef.current = await getMediaStream();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }
      
      // Set remote description
      await pc.setRemoteDescription(offer);
      
      // Create answer
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video"
      });
      
      console.log('📞 Created answer with audio:', answer.sdp?.includes('m=audio'));
      console.log('📞 Created answer with video:', answer.sdp?.includes('m=video'));
      
      await pc.setLocalDescription(answer);
      
      // Send answer
      sendSignal({ kind: "webrtc-answer", from: meId, sdp: answer });
      
      // Send call accepted signal
      sendSignal({ kind: "call-accepted", from: meId });
      
    } catch (error) {
      console.error("Failed to answer call:", error);
      setStatus("failed");
      setMediaError("Failed to answer call. Please try again.");
    }
  }, [meId, mode, getMediaStream, createPeerConnection, sendSignal, onStatus]);

  // Setup signaling channel
  useEffect(() => {
    if (!meId || !conversationId || !open) return;

    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === meId) return;

      console.log('📨 Received signal:', msg.kind);

      try {
        if (msg.kind === "webrtc-offer") {
          await answerCall(msg.sdp);
        } else if (msg.kind === "webrtc-answer") {
          const pc = pcRef.current;
          if (pc) {
            console.log("📞 Received answer, setting remote description...");
            await pc.setRemoteDescription(msg.sdp);
            console.log("✅ Remote description set");
          }
        } else if (msg.kind === "webrtc-ice") {
          const pc = pcRef.current;
          if (pc) {
            try {
              await pc.addIceCandidate(msg.candidate);
            } catch (error) {
              console.warn("Failed to add ICE candidate:", error);
            }
          }
        } else if (msg.kind === "call-accepted") {
          console.log("✅ Call accepted by peer");
        } else if (msg.kind === "call-declined") {
          console.log("❌ Call declined by peer");
          setStatus("missed");
          onStatus?.("missed");
        } else if (msg.kind === "bye") {
          endCall(true);
        }
      } catch (error) {
        console.error("Error handling signal:", error);
        setStatus("failed");
        onStatus?.("failed");
      }
    });

    ch.subscribe((status) => {
      console.log(`📡 Channel subscription status: ${status}`);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setStatus("failed");
        setMediaError("Failed to establish signaling connection. Please try again.");
      }
    });
    
    chanRef.current = ch;

    return () => {
      console.log(`🔌 Cleaning up signaling channel: ${channelName}`);
      try {
        supabase.removeChannel(ch);
      } catch {}
      chanRef.current = null;
    };
  }, [meId, conversationId, channelName, open, answerCall, onStatus]);

  // Auto-start call when open and meId is ready
  useEffect(() => {
    if (!meId || !open || !autoConnect) return;
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      startCall();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [meId, open, autoConnect, startCall]);

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

  // End call
  const endCall = useCallback((fromPeer = false) => {
    console.log('📞 Ending call', { fromPeer });
    
    // Clear timers
    if (dialTimerRef.current) {
      clearInterval(dialTimerRef.current);
      dialTimerRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clear remote stream
    remoteStreamRef.current = null;
    
    // Reset states
    setIsConnected(false);
    setConnectionAttempts(0);
    
    // Send bye signal
    if (!fromPeer && meId) {
      sendSignal({ kind: "bye", from: meId });
    }
    
    setStatus("ended");
    onStatus?.("ended");
  }, [meId, sendSignal, onStatus]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (dialTimerRef.current) clearInterval(dialTimerRef.current);
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  return {
    // State
    state: {
      status,
      muted,
      camOff,
      mediaError,
      dialSeconds,
      isConnected,
      connectionAttempts,
    },
    
    // Ref setters
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    
    // Controls
    setMuted: setMutedState,
    setCamOff: setCamOffState,
    toggleMute,
    toggleCamera,
    endCall,
    
    // Legacy refs
    localVideoRef,
    remoteVideoRef,
    
    // Additional controls
    startCall,
  };
}

