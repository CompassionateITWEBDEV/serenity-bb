"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

type SigPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

export function useSimpleVideoCall({
  conversationId,
  role,
  mode = "video",
  meId,
  peerUserId,
  onStatus,
}: {
  conversationId: string;
  role: CallRole;
  mode?: CallMode;
  meId: string;
  peerUserId: string;
  onStatus?: (status: "idle" | "connecting" | "connected" | "ended" | "failed") => void;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended" | "failed">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);

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

  // Send signal
  const sendSignal = useCallback((payload: SigPayload) => {
    if (!channelRef.current) return;
    
    console.log('📤 Sending signal:', payload.kind);
    channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload
    });
  }, []);

  // Get media stream with fallback constraints
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setError(null);
      
      // Start with basic constraints
      let constraints: MediaStreamConstraints = {
        audio: true,
        video: mode === "video" ? true : false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media stream acquired with basic constraints');
        return stream;
      } catch (basicError) {
        console.warn('Basic constraints failed, trying fallback:', basicError);
        
        // Fallback to minimal constraints
        constraints = {
          audio: { echoCancellation: false, noiseSuppression: false },
          video: mode === "video" ? { 
            width: { min: 320, ideal: 640 },
            height: { min: 240, ideal: 480 },
            frameRate: { min: 15, ideal: 30 }
          } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media stream acquired with fallback constraints');
        return stream;
      }
    } catch (error) {
      console.error("Failed to get media stream:", error);
      setError("Failed to access camera/microphone. Please check permissions and try again.");
      throw error;
    }
  }, [mode]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && meId) {
        sendSignal({ kind: "webrtc-ice", from: meId, candidate: event.candidate.toJSON() });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      
      if (pc.connectionState === "connected") {
        setStatus("connected");
        onStatus?.("connected");
      } else if (pc.connectionState === "failed") {
        console.warn("❌ Connection failed");
        setStatus("failed");
        onStatus?.("failed");
        setError("Connection failed. Please try again.");
      } else if (pc.connectionState === "disconnected") {
        setStatus("connecting");
        onStatus?.("connecting");
      }
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setStatus("connected");
        onStatus?.("connected");
      } else if (pc.iceConnectionState === "failed") {
        console.warn("❌ ICE connection failed");
        setStatus("failed");
        onStatus?.("failed");
        setError("Connection failed. Please check your internet connection.");
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`📡 Received remote ${event.track.kind} track`);
      
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      
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
  }, [meId, sendSignal, onStatus]);

  // Start call
  const startCall = useCallback(async () => {
    if (!meId || !conversationId) return;

    try {
      setStatus("connecting");
      onStatus?.("connecting");
      setError(null);

      // Get local media
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer for caller
      if (role === "caller") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: meId, sdp: offer });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
      onStatus?.("failed");
    }
  }, [meId, conversationId, role, getMediaStream, createPeerConnection, sendSignal, onStatus]);

  // Answer call
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!meId) return;

    try {
      setStatus("connecting");
      onStatus?.("connecting");

      // Get local media if not available
      if (!localStreamRef.current) {
        const stream = await getMediaStream();
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }
      
      // Set remote description and create answer
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      sendSignal({ kind: "webrtc-answer", from: meId, sdp: answer });
    } catch (error) {
      console.error("Failed to answer call:", error);
      setStatus("failed");
      onStatus?.("failed");
    }
  }, [meId, getMediaStream, createPeerConnection, sendSignal, onStatus]);

  // Setup signaling
  useEffect(() => {
    if (!meId || !conversationId) return;

    const channel = supabase.channel(channelName, { 
      config: { broadcast: { ack: true } } 
    });
    
    channel.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === meId) return;

      console.log('📨 Received signal:', msg.kind);

      try {
        if (msg.kind === "webrtc-offer") {
          await answerCall(msg.sdp);
        } else if (msg.kind === "webrtc-answer") {
          const pc = pcRef.current;
          if (pc) {
            await pc.setRemoteDescription(msg.sdp);
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
        } else if (msg.kind === "bye") {
          endCall(true);
        }
      } catch (error) {
        console.error("Error handling signal:", error);
        setStatus("failed");
        onStatus?.("failed");
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
      channelRef.current = null;
    };
  }, [meId, conversationId, channelName, answerCall, onStatus]);

  // Auto-start call
  useEffect(() => {
    if (meId && conversationId) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        startCall();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [meId, conversationId, startCall]);

  // Media controls
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = muted;
      });
      setMuted(!muted);
    }
  }, [muted]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = camOff;
      });
      setCamOff(!camOff);
    }
  }, [camOff]);

  // End call
  const endCall = useCallback((fromPeer = false) => {
    console.log('📞 Ending call', { fromPeer });
    
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
    
    // Send bye signal
    if (!fromPeer && meId) {
      sendSignal({ kind: "bye", from: meId });
    }
    
    setStatus("ended");
    onStatus?.("ended");
  }, [meId, sendSignal, onStatus]);

  // Cleanup
  useEffect(() => () => {
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  return {
    status,
    muted,
    camOff,
    error,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    toggleMute,
    toggleCamera,
    endCall,
    localVideoRef,
    remoteVideoRef,
  };
}

