"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ArrowLeft,
} from "lucide-react";

/**
 * ICE servers configuration for WebRTC
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
    console.log(`Setting up video listeners for ${label}`);
    
    const handleLoadedMetadata = () => {
      console.log(`✅ Video loaded for ${label}:`, {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        srcObject: !!video.srcObject,
        readyState: video.readyState
      });
      setShowVideo(true);
      setHasVideoStream(true);
    };
    
    const handleError = (e: any) => {
      console.error(`❌ Video error for ${label}:`, e);
      setShowVideo(false);
      setHasVideoStream(false);
    };
    
    const handleCanPlay = () => {
      console.log(`▶️ Video can play for ${label}`);
      setShowVideo(true);
      setHasVideoStream(true);
    };
    
    const handlePlay = () => {
      console.log(`▶️ Video playing for ${label}`);
      setShowVideo(true);
      setHasVideoStream(true);
    };
    
    const handleLoadStart = () => {
      console.log(`🔄 Video load started for ${label}`);
      setShowVideo(false);
      setHasVideoStream(false);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('error', handleError);
    
    // Force reload
    if (video.srcObject) {
      video.load();
    }
    
    // Periodic check for video stream detection (fallback)
    const checkVideoStream = () => {
      if (video.srcObject && video.readyState >= 2) {
        setShowVideo(true);
        setHasVideoStream(true);
      }
    };
    
    const checkInterval = setInterval(checkVideoStream, 1000);
    
    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('error', handleError);
      clearInterval(checkInterval);
    };
  }, [videoRef, label, hasVideoStream]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-900 shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        controls={false}
        className={`h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        style={{ 
          backgroundColor: '#000',
          transform: mirrored ? 'scaleX(-1)' : 'none'
        }}
        onLoadedMetadata={() => {
          console.log(`✅ Video metadata loaded for ${label}`);
          setShowVideo(true);
          setHasVideoStream(true);
        }}
        onError={(e) => {
          console.error(`❌ Video error for ${label}:`, e);
          setShowVideo(false);
          setHasVideoStream(false);
        }}
        onPlay={() => {
          console.log(`▶️ Video playing for ${label}`);
          setShowVideo(true);
          setHasVideoStream(true);
        }}
      />
      
      {/* Overlay when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Avatar className="mx-auto h-20 w-20 mb-4">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">
                {name ? name.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-sm font-medium">{name || label}</p>
            {!isConnected && (
              <p className="text-gray-400 text-xs mt-1">Connecting media...</p>
            )}
            {isConnected && !hasVideoStream && (
              <p className="text-yellow-400 text-xs mt-1">Waiting for video...</p>
            )}
            {isConnected && hasVideoStream && !showVideo && (
              <p className="text-orange-400 text-xs mt-1">Video loading...</p>
            )}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {label}
        </Badge>
        {isLocal && (
          <Badge variant="outline" className="text-xs">
            {mirrored ? "Mirrored" : "You"}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function VideoCallPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const qs = useSearchParams();
  const conversationId = params.conversationId || "";

  // URL parameters
  const role = qs.get("role") as "caller" | "callee" | null;
  const mode = qs.get("mode") as "audio" | "video" | null;
  const peerUserId = qs.get("peer") || undefined;
  const peerName = qs.get("peerName") || undefined;
  const autoAccept = qs.get("autoAccept") === "true";

  // State
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "ringing" | "connecting" | "connected" | "ended" | "failed">("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerInfo, setPeerInfo] = useState<{ name?: string; avatar?: string }>({});

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const channelName = useMemo(() => `call_${conversationId}`, [conversationId]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth error:", error);
          setMediaError("Authentication failed");
          return;
        }

        if (!session?.user) {
          setMediaError("Please log in to make video calls");
          return;
        }

        setMe({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          email: session.user.email,
        });
      } catch (error) {
        console.error("Auth check failed:", error);
        setMediaError("Authentication check failed");
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Get media stream
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: mode === "video" ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
      } : false,
    };

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
  }, [mode]);

  // Create peer connection
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    console.log("🔗 Created new peer connection");

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && me?.id) {
        console.log("🧊 Sending ICE candidate");
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: event.candidate.toJSON() });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      
      if (pc.connectionState === "connected") {
        setConnectionEstablished(true);
        setStatus("connected");
      } else if (pc.connectionState === "failed") {
        console.warn("❌ Connection failed");
        setStatus("failed");
        setMediaError("Connection failed. Please try again.");
      } else if (pc.connectionState === "disconnected") {
        if (connectionEstablished) {
          console.log("🔌 Connection lost, attempting to reconnect...");
          setStatus("connecting");
        }
      }
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnectionEstablished(true);
        setPeerConnected(true);
        setStatus("connected");
      } else if (pc.iceConnectionState === "failed") {
        console.warn("❌ ICE connection failed");
        setStatus("failed");
        setMediaError("Connection failed. Please check your internet connection.");
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
      
      // Setup remote video
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      
      // Setup remote audio
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
      
      console.log("🔄 Remote track received, validating connection...");
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id, connectionEstablished]);

  // Send signal through Supabase
  const sendSignal = useCallback((payload: SigPayload) => {
    if (!channelRef.current) return;
    
    channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload,
    });
  }, []);

  // Start call
  const startCall = useCallback(async () => {
    if (!me?.id || status === "connecting" || status === "connected") return;

    try {
      console.log("📞 Starting call...");
      setStatus("ringing");
      setMediaError(null);

      // Get local media
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
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
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video"
        });
        
        console.log('📞 Created offer');
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
      setMediaError(error instanceof Error ? error.message : "Failed to start call");
    }
  }, [me?.id, status, getMediaStream, createPeerConnection, sendSignal, role, mode]);

  // Answer call
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!me?.id || status === "connecting" || status === "connected") return;

    try {
      console.log("📞 Answering call...");
      setStatus("connecting");
      setMediaError(null);

      // Get local media
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
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
      sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
    } catch (error) {
      console.error("Failed to answer call:", error);
      setStatus("failed");
      setMediaError(error instanceof Error ? error.message : "Failed to answer call");
    }
  }, [me?.id, status, getMediaStream, createPeerConnection, sendSignal]);

  // End call
  const endCall = useCallback(() => {
    console.log("📞 Ending call...");
    
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
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }

    // Send bye signal
    if (me?.id) {
      sendSignal({ kind: "bye", from: me.id });
    }

    // Reset state
    setStatus("ended");
    setMediaError(null);
    setConnectionEstablished(false);
    setPeerConnected(false);
  }, [localStreamRef, me?.id, sendSignal]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = muted;
      });
      setMuted(!muted);
    }
  }, [muted]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current && mode === "video") {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = camOff;
      });
      setCamOff(!camOff);
    }
  }, [mode, camOff]);

  // Setup signaling
  useEffect(() => {
    if (!me?.id || !conversationId) return;

    const channel = supabase.channel(channelName, { 
      config: { broadcast: { ack: true } } 
    });
    
    channel.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

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
        setMediaError("Connection error occurred");
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
  }, [me?.id, conversationId, channelName, answerCall, endCall]);

  // Auto-start call
  useEffect(() => {
    if (me?.id && conversationId && status === "idle") {
      const timer = setTimeout(() => {
        startCall();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [me?.id, conversationId, status, startCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  // Show loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth error
  if (mediaError && !connectionEstablished) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{mediaError}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/messages/${conversationId}`)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {mode === "video" ? "Video Call" : "Audio Call"}
            </h1>
            <p className="text-sm text-gray-400">{peerName || "Contact"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              status === "connected" ? "border-green-500 text-green-400" :
              status === "connecting" ? "border-yellow-500 text-yellow-400" :
              status === "failed" ? "border-red-500 text-red-400" :
              "border-gray-500 text-gray-400"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {mode === "video" ? (
          <div className="w-full max-w-4xl">
            {/* Connection Status */}
            {!connectionEstablished && (
              <div className="mb-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">
                  {status === "ringing" ? "Ringing..." : 
                   status === "connecting" ? "Connecting..." : 
                   "Establishing connection..."}
                </h2>
                <p className="text-gray-400">
                  {status === "ringing" ? "Waiting for the other person to answer" :
                   status === "connecting" ? "Setting up video call..." :
                   "Please wait while we connect you..."}
                </p>
              </div>
            )}

            {/* Video Grid - Show when connected */}
            {connectionEstablished && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Local Video */}
                <VideoTile
                  videoRef={localVideoRef}
                  label="You"
                  mirrored={true}
                  isLocal={true}
                  isConnected={connectionEstablished && peerConnected}
                  name={me?.name || me?.email}
                />

                {/* Remote Video */}
                <VideoTile
                  videoRef={remoteVideoRef}
                  label={peerInfo?.name || peerName || "Remote"}
                  isConnected={connectionEstablished && peerConnected}
                  name={peerInfo?.name || peerName}
                  avatarUrl={peerInfo?.avatar}
                />
              </div>
            )}

            {/* Controls - Show when connected */}
            {connectionEstablished && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={toggleMute}
                  variant={muted ? "destructive" : "outline"}
                  size="lg"
                  className="rounded-full w-14 h-14"
                >
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                <Button
                  onClick={toggleCamera}
                  variant={camOff ? "destructive" : "outline"}
                  size="lg"
                  className="rounded-full w-14 h-14"
                >
                  {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>

                <Button
                  onClick={() => {
                    endCall();
                    router.push(`/messages/${conversationId}`);
                  }}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-14 h-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Audio Call UI */
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-16 w-16 text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">{peerName || "Contact"}</h2>
              <p className="text-gray-400">
                {status === "ringing" && "Ringing..."}
                {status === "connecting" && "Connecting..."}
                {status === "connected" && "Connected"}
                {status === "failed" && "Connection Failed"}
              </p>
            </div>

            {/* Audio Controls */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={toggleMute}
                variant={muted ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              <Button
                onClick={() => {
                  endCall();
                  router.push(`/messages/${conversationId}`);
                }}
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}