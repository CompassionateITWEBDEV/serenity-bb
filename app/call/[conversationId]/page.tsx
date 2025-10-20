"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { callTracker, type CallStatus as CallTrackingStatus } from "@/lib/call-tracking";
import { determineUserRole, getMessagesUrl, type UserRole } from "@/lib/user-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Settings,
  Maximize2,
  Minimize2,
  Users,
  VolumeX,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import DeviceStatusIndicator from "@/components/accessibility/DeviceStatusIndicator";
import AccessibilityHelp from "@/components/accessibility/AccessibilityHelp";
import AudioCallInterface from "@/components/call/AudioCallInterface";
import CallModeSelector from "@/components/call/CallModeSelector";

/**
 * ICE Servers Configuration - Simplified for Vercel compatibility
 */
function buildIceServers(): RTCIceServer[] {
  // Use default STUN server for simplicity and Vercel compatibility
  return [{ urls: ["stun:stun.l.google.com:19302"] }];
}

/**
 * Signaling Message Types
 */
type SigPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

/**
 * Video Tile Component
 */
function VideoTile({
  videoRef,
  label,
  mirrored = false,
  isLocal = false,
  isConnected = false,
  avatarUrl,
  name,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  label: string;
  mirrored?: boolean;
  isLocal?: boolean;
  isConnected?: boolean;
  avatarUrl?: string;
  name?: string;
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [hasVideoStream, setHasVideoStream] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handleLoadedMetadata = () => {
      setShowVideo(true);
      setHasVideoStream(true);
    };
    
    const handleError = () => {
      setShowVideo(false);
      setHasVideoStream(false);
    };
    
    const handleCanPlay = () => {
      video.play().catch(console.warn);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoRef]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted={isLocal}
      />
      
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <Avatar className="w-20 h-20 mx-auto mb-2">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">
                {name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-sm">{name || label}</p>
            {!isConnected && (
              <p className="text-gray-400 text-xs mt-1">Waiting for video...</p>
            )}
          </div>
        </div>
      )}
      
      {isLocal && (
        <div className="absolute top-3 right-3">
          <div className="rounded-full bg-black/60 p-2 backdrop-blur">
            <Video className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Call Controls Component
 */
function CallControls({
  status,
  muted,
  camOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onShareScreen,
  isSharingScreen,
  mode,
  hasAudio,
  hasVideo,
  isFallbackStream,
  audioLevel,
}: {
  status: string;
  muted: boolean;
  camOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onShareScreen: () => void;
  isSharingScreen: boolean;
  mode: "audio" | "video";
  hasAudio?: boolean | null;
  hasVideo?: boolean | null;
  isFallbackStream?: boolean;
  audioLevel?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-4 p-6">
      <div className="flex items-center gap-3">
        {/* Mute/Unmute */}
        <div className="relative">
          <Button
            size="lg"
            variant={muted ? "destructive" : "secondary"}
            onClick={onToggleMute}
            className="rounded-full w-12 h-12"
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {audioLevel !== undefined && audioLevel > 0 && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="w-1 bg-green-500 rounded-full" style={{ height: `${audioLevel * 20}px` }} />
            </div>
          )}
        </div>

        {/* Camera Toggle */}
        {mode === "video" && (
          <Button
            size="lg"
            variant={camOff ? "destructive" : "secondary"}
            onClick={onToggleCamera}
            className="rounded-full w-12 h-12"
          >
            {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        )}

        {/* Screen Share */}
        <Button
          size="lg"
          variant={isSharingScreen ? "default" : "secondary"}
          onClick={onShareScreen}
          className="rounded-full w-12 h-12"
        >
          {isSharingScreen ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        {/* End Call */}
        <Button
          size="lg"
          variant="destructive"
          onClick={onEndCall}
          className="rounded-full w-12 h-12"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Main Call Room Page Component
 */
export default function CallRoomPage() {
  // Router and params
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId as string;
  const mode = (searchParams.get("mode") as "audio" | "video") || "video";
  const autoAccept = searchParams.get("autoAccept") === "true";

  // State management
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [role, setRole] = useState<"caller" | "callee" | null>(null);
  const [me, setMe] = useState<any>(null);
  const [peer, setPeer] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [callProcessed, setCallProcessed] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelRef = useRef<number>(0);

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
        if (error) {
          console.error("Session error:", error);
          router.push("/login");
          return;
        }
        
        if (!session?.user) {
          router.push("/login");
          return;
        }

        const userRole = await determineUserRole(session.user.id);
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
          
          if (error) {
            console.error("Peer info error:", error);
            return;
          }
          
          if (data) {
            setPeer({ staff_id: data.staff_id, ...data.staff });
          }
        } else {
          const { data, error } = await supabase
            .from("appointments")
            .select("patient_id, patient:patient_id(name, avatar_url)")
            .eq("staff_id", me.id)
            .eq("id", conversationId)
            .single();
          
          if (error) {
            console.error("Peer info error:", error);
            return;
          }
          
          if (data) {
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
   * Wait for video element refs to be ready
   */
  const waitForRef = useCallback(async <T,>(ref: React.RefObject<T>, tries = 20, delay = 100): Promise<T | null> => {
    for (let i = 0; i < tries; i++) {
      if (ref.current) return ref.current;
      await new Promise((r) => setTimeout(r, delay));
    }
    return null;
  }, []);

  /**
   * Setup video element with stream
   */
  const setupVideoElement = useCallback((ref: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, isLocal: boolean) => {
    if (!ref.current) return;
    
    const video = ref.current;
    video.srcObject = stream;
    video.muted = isLocal;
    video.playsInline = true;
    video.autoplay = true;
    
    video.play().catch(console.warn);
  }, []);

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
      iceServers: buildIceServers(),
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
        callTracker.updateCallStatus(conversationId, "connected").catch(console.warn);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        setStatus("connected");
        callTracker.updateCallStatus(conversationId, "connected").catch(console.warn);
      }
    };

    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(ev.track);
      
      // Setup remote video
      if (remoteVideoRef.current) {
        setupVideoElement(remoteVideoRef, remoteStreamRef.current, false);
      }
    };

    return pc;
  }, [me?.id, peerUserId, conversationId, setupVideoElement]);

  /**
   * Send signaling message
   */
  const sendSignal = useCallback(async (payload: SigPayload) => {
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
   * Start or prepare call
   */
  const startOrPrep = useCallback(async () => {
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
        setupVideoElement(localVideoRef, stream, true);
      }

      if (role === "caller") {
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
        setStatus("connecting");
      } else {
        // Callee waits for offer
        setStatus("idle");
      }
    } catch (error) {
      console.error("Start/prep failed:", error);
      setStatus("failed");
      setMediaError("Failed to access camera/microphone");
    }
  }, [me?.id, peerUserId, role, getMediaStream, createPeerConnection, setupVideoElement, sendSignal]);

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
      
      // Update call status
      await callTracker.updateCallStatus(conversationId, "ended");
      
      // Navigate back
      router.push(getMessagesUrl(me?.role || "patient"));
    } catch (error) {
      console.error("End call failed:", error);
      router.push("/dashboard");
    }
  }, [me, conversationId, sendSignal, router]);

  /**
   * Signaling channel setup
   */
  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const channel = supabase.channel(threadChannel);
    
    channel.on("broadcast", { event: "signal" }, ({ payload }: { payload: SigPayload }) => {
      if (payload.from === me.id) return;

      switch (payload.kind) {
        case "webrtc-offer":
          if (role === "callee" && !callProcessed) {
            setCallProcessed(true);
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
  }, [conversationId, me?.id, role, callProcessed, endCall]);

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
        setupVideoElement(localVideoRef, stream, true);
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
  }, [getMediaStream, createPeerConnection, setupVideoElement, sendSignal, me?.id]);

  /**
   * Auto-start call for caller
   */
  useEffect(() => {
    if (role === "caller" && authChecked && me?.id) {
      startOrPrep();
    }
  }, [role, authChecked, me?.id, startOrPrep]);

  /**
   * Auto-accept for callee
   */
  useEffect(() => {
    if (role === "callee" && autoAccept && authChecked && me?.id) {
      startOrPrep();
    }
  }, [role, autoAccept, authChecked, me?.id, startOrPrep]);

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

  const handleShareScreen = useCallback(async () => {
    try {
      if (isSharingScreen) {
        // Stop screen share
        localStreamRef.current?.getVideoTracks().forEach(track => track.stop());
        const stream = await getMediaStream();
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => {
          pcRef.current?.addTrack(track, stream);
        });
        setIsSharingScreen(false);
      } else {
        // Start screen share
        const stream = await navigator.mediaDevices.getDisplayMedia();
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => {
          pcRef.current?.addTrack(track, stream);
        });
        setIsSharingScreen(true);
      }
    } catch (error) {
      console.error("Screen share failed:", error);
    }
  }, [isSharingScreen, getMediaStream]);

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

  // Main call interface with error boundary
  try {
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
          
          <div className="flex items-center gap-2">
            <DeviceStatusIndicator 
              hasMicrophone={!!localStreamRef.current?.getAudioTracks().length}
              hasCamera={!!localStreamRef.current?.getVideoTracks().length}
              mode={mode}
              isFallbackMode={false}
              onSwitchToChat={() => router.push(getMessagesUrl(me?.role || "patient"))}
            />
            <AccessibilityHelp />
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4">
          {mode === "video" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
              <VideoTile
                videoRef={localVideoRef}
                label="You"
                mirrored={true}
                isLocal={true}
                isConnected={status === "connected"}
                avatarUrl={me?.avatar_url}
                name={me?.name}
              />
              <VideoTile
                videoRef={remoteVideoRef}
                label="Peer"
                isConnected={status === "connected"}
                avatarUrl={peer?.avatar_url}
                name={peer?.name}
              />
            </div>
          ) : (
            <AudioCallInterface
              peerName={peer?.name || "Unknown"}
              peerAvatar={peer?.avatar_url}
              status={status}
              callDuration={callDuration}
              muted={muted}
              isMuted={muted}
              onToggleMute={handleToggleMute}
              onEndCall={endCall}
              onToggleSpeaker={() => {}}
              isSpeakerOn={true}
              audioLevel={audioLevelRef.current}
              hasAudio={!!localStreamRef.current?.getAudioTracks().length}
              isFallbackStream={false}
              formatDuration={(seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`}
            />
          )}
        </div>

        {/* Controls */}
        <CallControls
          status={status}
          muted={muted}
          camOff={camOff}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onEndCall={endCall}
          onShareScreen={handleShareScreen}
          isSharingScreen={isSharingScreen}
          mode={mode}
          hasAudio={!!localStreamRef.current?.getAudioTracks().length}
          hasVideo={!!localStreamRef.current?.getVideoTracks().length}
          audioLevel={audioLevelRef.current}
        />
      </div>
    );
  } catch (error) {
    console.error("Render error:", error);
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Render Error</h2>
          <p className="text-gray-300 mb-4">Something went wrong while rendering the call interface.</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
}