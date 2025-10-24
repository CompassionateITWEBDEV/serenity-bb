"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";
export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "failed";

type SignalPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

interface UseRobustVideoCallOptions {
  conversationId: string;
  role: CallRole;
  mode?: CallMode;
  meId: string;
  peerUserId: string;
  onStatus?: (status: CallStatus) => void;
  autoStart?: boolean;
}

interface UseRobustVideoCallReturn {
  status: CallStatus;
  muted: boolean;
  camOff: boolean;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  setLocalVideoRef: (ref: HTMLVideoElement | null) => void;
  setRemoteVideoRef: (ref: HTMLVideoElement | null) => void;
  setRemoteAudioRef: (ref: HTMLAudioElement | null) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  endCall: () => void;
  startCall: () => void;
}

/**
 * Robust WebRTC video call hook with comprehensive error handling
 */
export function useRobustVideoCall({
  conversationId,
  role,
  mode = "video",
  meId,
  peerUserId,
  onStatus,
  autoStart = true,
}: UseRobustVideoCallOptions): UseRobustVideoCallReturn {
  // State
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const channelName = useMemo(() => `call_${conversationId}`, [conversationId]);

  // ICE servers configuration
  const iceServers = useMemo(() => [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ], []);

  // Media constraints
  const getMediaConstraints = useCallback((): MediaStreamConstraints => {
    const baseConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    if (mode === "video") {
      baseConstraints.video = {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
      };
    }

    return baseConstraints;
  }, [mode]);

  // Get media stream with fallback
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    const constraints = getMediaConstraints();
    
    try {
      console.log("🎥 Requesting media stream with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream acquired:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamId: stream.id
      });
      return stream;
    } catch (error) {
      console.warn("⚠️ Primary media request failed, trying fallback...", error);
      
      // Fallback to basic constraints
      const fallbackConstraints: MediaStreamConstraints = {
        audio: true,
        video: mode === "video" ? { width: 640, height: 480 } : false,
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        console.log("✅ Fallback media stream acquired");
        return stream;
      } catch (fallbackError) {
        console.error("❌ All media requests failed:", fallbackError);
        throw new Error("Unable to access camera/microphone. Please check permissions.");
      }
    }
  }, [getMediaConstraints, mode]);

  // Create peer connection
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers });
    console.log("🔗 Created new peer connection");

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && meId) {
        console.log("🧊 Sending ICE candidate");
        sendSignal({ kind: "webrtc-ice", from: meId, candidate: event.candidate.toJSON() });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      
      if (pc.connectionState === "connected") {
        isConnectedRef.current = true;
        setStatus("connected");
        onStatus?.("connected");
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      } else if (pc.connectionState === "failed") {
        console.warn("❌ Connection failed");
        setStatus("failed");
        setError("Connection failed. Please try again.");
        onStatus?.("failed");
      } else if (pc.connectionState === "disconnected") {
        if (isConnectedRef.current) {
          console.log("🔌 Connection lost, attempting to reconnect...");
          setStatus("connecting");
          onStatus?.("connecting");
        }
      }
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        isConnectedRef.current = true;
        setStatus("connected");
        onStatus?.("connected");
      } else if (pc.iceConnectionState === "failed") {
        console.warn("❌ ICE connection failed");
        setStatus("failed");
        setError("Connection failed. Please check your internet connection.");
        onStatus?.("failed");
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`📡 Received remote ${event.track.kind} track:`, event.track.label);
      
      if (!remoteStream) {
        const newRemoteStream = new MediaStream();
        setRemoteStream(newRemoteStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = newRemoteStream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = newRemoteStream;
        }
      }
      
      // Add track to existing stream
      const currentRemoteStream = remoteStream || new MediaStream();
      currentRemoteStream.addTrack(event.track);
      setRemoteStream(currentRemoteStream);
    };

    pcRef.current = pc;
    return pc;
  }, [iceServers, meId, remoteStream]);

  // Send signal through Supabase
  const sendSignal = useCallback((payload: SignalPayload) => {
    if (!channelRef.current) return;
    
    channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload,
    });
  }, []);

  // Start call
  const startCall = useCallback(async () => {
    if (!meId || status === "connecting" || status === "connected") return;

    try {
      console.log("📞 Starting call...");
      setStatus("ringing");
      setError(null);
      onStatus?.("ringing");

      // Set connection timeout (30 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnectedRef.current) {
          console.warn("⚠️ Connection timeout");
          setStatus("failed");
          setError("Connection timeout. Please try again.");
          onStatus?.("failed");
        }
      }, 30000);

      // Get local media
      const stream = await getMediaStream();
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection:`, track.label);
        pc.addTrack(track, stream);
      });

      // Create and send offer for caller
      if (role === "caller") {
        setStatus("connecting");
        onStatus?.("connecting");
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video"
        });
        
        console.log('📞 Created offer');
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: meId, sdp: offer });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
      setError(error instanceof Error ? error.message : "Failed to start call");
      onStatus?.("failed");
    }
  }, [meId, status, getMediaStream, createPeerConnection, sendSignal, role, mode, onStatus]);

  // Answer call
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!meId || status === "connecting" || status === "connected") return;

    try {
      console.log("📞 Answering call...");
      setStatus("connecting");
      setError(null);
      onStatus?.("connecting");

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnectedRef.current) {
          console.warn("⚠️ Connection timeout");
          setStatus("failed");
          setError("Connection timeout. Please try again.");
          onStatus?.("failed");
        }
      }, 30000);

      // Get local media
      const stream = await getMediaStream();
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection:`, track.label);
        pc.addTrack(track, stream);
      });

      // Set remote description and create answer
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('📞 Created answer');
      sendSignal({ kind: "webrtc-answer", from: meId, sdp: answer });
    } catch (error) {
      console.error("Failed to answer call:", error);
      setStatus("failed");
      setError(error instanceof Error ? error.message : "Failed to answer call");
      onStatus?.("failed");
    }
  }, [meId, status, getMediaStream, createPeerConnection, sendSignal, onStatus]);

  // End call
  const endCall = useCallback(() => {
    console.log("📞 Ending call...");
    
    // Clear timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear remote stream
    setRemoteStream(null);

    // Send bye signal
    if (meId) {
      sendSignal({ kind: "bye", from: meId });
    }

    // Reset state
    setStatus("ended");
    setError(null);
    isConnectedRef.current = false;
    onStatus?.("ended");
  }, [localStream, meId, sendSignal, onStatus]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = muted;
      });
      setMuted(!muted);
    }
  }, [localStream, muted]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStream && mode === "video") {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = camOff;
      });
      setCamOff(!camOff);
    }
  }, [localStream, mode, camOff]);

  // Ref setters
  const setLocalVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    localVideoRef.current = ref;
    if (ref && localStream) {
      ref.srcObject = localStream;
    }
  }, [localStream]);

  const setRemoteVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    remoteVideoRef.current = ref;
    if (ref && remoteStream) {
      ref.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const setRemoteAudioRef = useCallback((ref: HTMLAudioElement | null) => {
    remoteAudioRef.current = ref;
    if (ref && remoteStream) {
      ref.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Setup signaling
  useEffect(() => {
    if (!meId || !conversationId) return;

    const channel = supabase.channel(channelName, { 
      config: { broadcast: { ack: true } } 
    });
    
    channel.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SignalPayload;
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
          endCall();
        }
      } catch (error) {
        console.error("Error handling signal:", error);
        setStatus("failed");
        setError("Connection error occurred");
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
  }, [meId, conversationId, channelName, answerCall, endCall, onStatus]);

  // Auto-start call
  useEffect(() => {
    if (autoStart && meId && conversationId && status === "idle") {
      const timer = setTimeout(() => {
        startCall();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, meId, conversationId, status, startCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    status,
    muted,
    camOff,
    error,
    localStream,
    remoteStream,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    toggleMute,
    toggleCamera,
    endCall,
    startCall,
  };
}

