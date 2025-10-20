"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ArrowLeft,
} from "lucide-react";

/**
 * Minimal Video Call Component for Vercel Compatibility
 */
export default function CallRoomPage() {
  // Router and params
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId as string;
  const mode = (searchParams.get("mode") as "audio" | "video") || "video";

  // State management
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [role, setRole] = useState<"caller" | "callee" | null>(null);
  const [me, setMe] = useState<any>(null);
  const [peer, setPeer] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived values
  const threadChannel = `call-${conversationId}`;
  const peerUserId = me?.role === "patient" ? peer?.staff_id : peer?.patient_id;

  /**
   * Authentication and user setup
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          router.push("/login");
          return;
        }

        // Simple role determination
        const { data: patientData } = await supabase
          .from("patients")
          .select("id")
          .eq("id", session.user.id)
          .single();

        const userRole = patientData ? "patient" : "staff";
        setMe({ id: session.user.id, role: userRole });
        setRole(userRole === "patient" ? "callee" : "caller");
        setAuthChecked(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setStatus("failed");
        setMediaError("Authentication failed. Please try again.");
      }
    };

    checkAuth();
  }, [router]);

  /**
   * Get peer information
   */
  useEffect(() => {
    if (!me?.id || !conversationId) return;

    const getPeerInfo = async () => {
      try {
        if (me.role === "patient") {
          const { data, error } = await supabase
            .from("appointments")
            .select("staff_id, staff:staff_id(name, avatar_url)")
            .eq("patient_id", me.id)
            .eq("id", conversationId)
            .single();
          
          if (!error && data) {
            setPeer({ staff_id: data.staff_id, ...data.staff });
          }
        } else {
          const { data, error } = await supabase
            .from("appointments")
            .select("patient_id, patient:patient_id(name, avatar_url)")
            .eq("staff_id", me.id)
            .eq("id", conversationId)
            .single();
          
          if (!error && data) {
            setPeer({ patient_id: data.patient_id, ...data.patient });
          }
        }
      } catch (error) {
        console.error("Failed to get peer info:", error);
        setStatus("failed");
        setMediaError("Failed to load call information");
      }
    };

    getPeerInfo();
  }, [me, conversationId]);

  /**
   * Get media stream
   */
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: mode === "video",
        audio: true,
      });
    } catch (error) {
      console.error("Failed to get media stream:", error);
      throw error;
    }
  }, [mode]);

  /**
   * Create peer connection
   */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    pc.onicecandidate = (ev) => {
      if (ev.candidate && peerUserId) {
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: ev.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setStatus("connected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        setStatus("connected");
      }
    };

    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(ev.track);
      
      // Setup remote video
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(console.warn);
      }
    };

    return pc;
  }, [me?.id, peerUserId]);

  /**
   * Send signaling message
   */
  const sendSignal = useCallback(async (payload: any) => {
    try {
      await supabase.channel(threadChannel).send({
        type: "broadcast",
        event: "signal",
        payload,
      });
    } catch (error) {
      console.warn("Send signal error:", error);
    }
  }, [threadChannel]);

  /**
   * Start call
   */
  const startCall = useCallback(async () => {
    if (!me?.id || !peerUserId) return;

    try {
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
      const pc = createPeerConnection();
      pcRef.current = pc;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Setup local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(console.warn);
      }

      if (role === "caller") {
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
        setStatus("connecting");
      } else {
        setStatus("idle");
      }
    } catch (error) {
      console.error("Start call failed:", error);
      setStatus("failed");
      setMediaError("Failed to access camera/microphone");
    }
  }, [me?.id, peerUserId, role, getMediaStream, createPeerConnection, sendSignal]);

  /**
   * End call
   */
  const endCall = useCallback(async () => {
    try {
      // Stop all tracks
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      remoteStreamRef.current?.getTracks().forEach(track => track.stop());
      
      // Close peer connection
      pcRef.current?.close();
      
      // Send bye signal
      if (me?.id) {
        await sendSignal({ kind: "bye", from: me.id });
      }
      
      // Navigate back
      router.push("/dashboard");
    } catch (error) {
      console.error("End call failed:", error);
      router.push("/dashboard");
    }
  }, [me, sendSignal, router]);

  /**
   * Signaling channel setup
   */
  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const channel = supabase.channel(threadChannel);
    
    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      if (payload.from === me.id) return;

      switch (payload.kind) {
        case "webrtc-offer":
          if (role === "callee") {
            handleOffer(payload.sdp);
          }
          break;
          
        case "webrtc-answer":
          if (role === "caller" && pcRef.current) {
            pcRef.current.setRemoteDescription(payload.sdp);
          }
          break;
          
        case "webrtc-ice":
          if (pcRef.current) {
            pcRef.current.addIceCandidate(payload.candidate);
          }
          break;
          
        case "bye":
          endCall();
          break;
      }
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, me?.id, role, endCall]);

  /**
   * Handle incoming offer
   */
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      setStatus("connecting");
      
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
      const pc = createPeerConnection();
      pcRef.current = pc;

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Setup local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(console.warn);
      }

      // Set remote description and create answer
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      setStatus("connected");
    } catch (error) {
      console.error("Handle offer failed:", error);
      setStatus("failed");
      setMediaError("Failed to accept call");
    }
  }, [getMediaStream, createPeerConnection, sendSignal, me?.id]);

  /**
   * Auto-start call for caller
   */
  useEffect(() => {
    if (role === "caller" && authChecked && me?.id) {
      startCall();
    }
  }, [role, authChecked, me?.id, startCall]);

  /**
   * Call duration timer
   */
  useEffect(() => {
    if (status === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [status]);

  /**
   * Control handlers
   */
  const handleToggleMute = useCallback(() => {
    setMuted(!muted);
    localStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = muted;
    });
  }, [muted]);

  const handleToggleCamera = useCallback(() => {
    setCamOff(!camOff);
    localStreamRef.current?.getVideoTracks().forEach(track => {
      track.enabled = camOff;
    });
  }, [camOff]);

  // Loading state
  if (!authChecked || !me) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (mediaError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Media Access Error</h2>
          <p className="text-gray-300 mb-4">{mediaError}</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Main call interface
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{peer?.name || "Unknown"}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={status === "connected" ? "default" : "secondary"}>
                {status === "connected" ? "Connected" : 
                 status === "connecting" ? "Connecting..." : 
                 status === "idle" ? "Preparing..." : "Failed"}
              </Badge>
              {callDuration > 0 && (
                <span className="text-sm text-gray-400">
                  {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        {mode === "video" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
            {/* Local Video */}
            <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                autoPlay
                playsInline
                muted
              />
              {!localStreamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <Avatar className="w-20 h-20 mx-auto mb-2">
                      <AvatarImage src={me?.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {me?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white text-sm">{me?.name || "You"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Video */}
            <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              {!remoteStreamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <Avatar className="w-20 h-20 mx-auto mb-2">
                      <AvatarImage src={peer?.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {peer?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white text-sm">{peer?.name || "Peer"}</p>
                    {status !== "connected" && (
                      <p className="text-gray-400 text-xs mt-1">Waiting for video...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4">
                <AvatarImage src={peer?.avatar_url} />
                <AvatarFallback className="text-4xl">
                  {peer?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-semibold mb-2">{peer?.name || "Unknown"}</h2>
              <p className="text-gray-400">Audio Call</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6">
        <div className="flex items-center gap-3">
          {/* Mute/Unmute */}
          <Button
            size="lg"
            variant={muted ? "destructive" : "secondary"}
            onClick={handleToggleMute}
            className="rounded-full w-12 h-12"
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Camera Toggle */}
          {mode === "video" && (
            <Button
              size="lg"
              variant={camOff ? "destructive" : "secondary"}
              onClick={handleToggleCamera}
              className="rounded-full w-12 h-12"
            >
              {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          {/* End Call */}
          <Button
            size="lg"
            variant="destructive"
            onClick={endCall}
            className="rounded-full w-12 h-12"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}