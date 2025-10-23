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
 * Optional TURN/STUN via env:
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
      console.log(`🎬 Video started playing for ${label}`);
      setShowVideo(true);
      setHasVideoStream(true);
    };
    
    const handleLoadStart = () => {
      console.log(`🔄 Video load started for ${label}`);
    };
    
    // Add all event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('error', handleError);
    
    // Check if video already has a source
    if (video.srcObject) {
      console.log(`Video ${label} already has srcObject, triggering load`);
      video.load(); // Force reload
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
      
      {/* Always show overlay for debugging */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!showVideo && (
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
      )}
      </div>
      
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

export default function CallRoomPage() {
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [status, setStatus] = useState<"idle" | "ringing" | "connecting" | "connected" | "ended" | "failed">("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccessibilityHelp, setShowAccessibilityHelp] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [isFallbackStream, setIsFallbackStream] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [peerInfo, setPeerInfo] = useState<{ name?: string; avatar?: string }>({});
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const threadChanRef = useRef<any>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Channel name for signaling
  const threadChannel = useMemo(() => `call-${conversationId}`, [conversationId]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setMe({ id: user.id, name: user.user_metadata?.full_name, email: user.email });
          const role = await determineUserRole(user.id);
          setUserRole(role);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  // Set peer info
  useEffect(() => {
    setPeerInfo({ name: peerName });
  }, [peerName]);

  // Simplified video element setup
  const setupVideoElement = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream | null, isLocal: boolean) => {
    const video = videoRef.current;
    if (!video || !stream) {
      console.warn(`⚠️ Cannot setup video element: videoRef=${!!video}, stream=${!!stream}`);
      return false;
    }

    console.log(`🎥 Setting up ${isLocal ? 'local' : 'remote'} video element:`, {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
      streamId: stream.id,
      videoElement: !!video
    });

    // Set video properties
    video.muted = isLocal;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    
    // Set stream
    video.srcObject = stream;
    
    // Play the video
    video.play().catch(error => {
      console.warn(`Video play failed for ${isLocal ? 'local' : 'remote'}:`, error);
    });

    return true;
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers()
    });

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setStatus("connected");
        setConnectionEstablished(true);
        setPeerConnected(true);
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        console.log("✅ Peer connection established - video screen now accessible");
      } else if (pc.iceConnectionState === "failed") {
        console.warn("⚠️ ICE connection failed");
        setStatus("failed");
        setConnectionEstablished(false);
        setPeerConnected(false);
        setMediaError("Connection failed. Please try again.");
      } else if (pc.iceConnectionState === "disconnected") {
        console.warn("⚠️ ICE connection disconnected");
        setConnectionEstablished(false);
        setPeerConnected(false);
        setStatus("connecting");
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        setConnectionEstablished(true);
        setPeerConnected(true);
        console.log("✅ WebRTC connection established - video screen now accessible");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setConnectionEstablished(false);
        setPeerConnected(false);
        console.log("❌ WebRTC connection lost");
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
        setupVideoElement(remoteVideoRef, remoteStreamRef.current, false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [conversationId, setupVideoElement]);

  // Get media stream
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setMediaError(null);
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

  // Send signaling message
  const sendSignal = useCallback((payload: SigPayload) => {
    if (!threadChanRef.current) return;
    
    console.log('📤 Sending signal:', payload.kind);
    threadChanRef.current.send({
      type: "broadcast",
      event: "signal",
      payload
    });
  }, []);

  // Start call (caller)
  const startCall = useCallback(async () => {
    if (!me?.id || !peerUserId) return;

    try {
      setStatus("connecting");
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (!connectionEstablished) {
          console.warn("⚠️ Connection timeout - call taking too long to establish");
          setStatus("failed");
          setMediaError("Connection timeout. Please try again.");
        }
      }, 30000); // 30 seconds timeout
      
      // Get local media
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
      // Setup local video
      setupVideoElement(localVideoRef, stream, true);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video"
      });
      
      await pc.setLocalDescription(offer);
      
      // Send offer
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      
      // Ring the peer
      await ringPeer();
      
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
      setMediaError("Failed to start call. Please try again.");
    }
  }, [me?.id, peerUserId, mode, getMediaStream, setupVideoElement, createPeerConnection, sendSignal, connectionEstablished]);

  // Answer call (callee)
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!me?.id) return;

    try {
      setStatus("connecting");
      
      // Get local media
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      
      // Setup local video
      setupVideoElement(localVideoRef, stream, true);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Set remote description
      await pc.setRemoteDescription(offer);
      
      // Create answer
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video"
      });
      
      await pc.setLocalDescription(answer);
      
      // Send answer
      sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      
      // Wait for connection to be established before setting status
      console.log("📞 Answer sent, waiting for connection establishment...");
      setStatus("connecting");
      
    } catch (error) {
      console.error("Failed to answer call:", error);
      setStatus("failed");
      setMediaError("Failed to answer call. Please try again.");
    }
  }, [me?.id, mode, getMediaStream, setupVideoElement, createPeerConnection, sendSignal, conversationId]);

  // Ring peer
  const ringPeer = useCallback(async () => {
    if (!peerUserId || !conversationId || !me?.id) return;
    
    const callerName = me.name || me.email || "Caller";
    
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    const staffCh = supabase.channel(`staff-calls-${peerUserId}`, { config: { broadcast: { ack: true } } });
    
    try {
      await Promise.all([
        new Promise<void>((res, rej) => {
          const to = setTimeout(() => rej(new Error("subscribe timeout")), 5000);
          ch.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              res();
            }
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              rej(new Error(String(s)));
            }
          });
        }),
        new Promise<void>((res, rej) => {
          const to = setTimeout(() => rej(new Error("staff subscribe timeout")), 5000);
          staffCh.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              res();
            }
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              rej(new Error(String(s)));
            }
          });
        })
      ]);

      // Send notifications
      await ch.send({
        type: "broadcast",
        event: "invite",
        payload: { conversationId, fromId: me.id, fromName: callerName, mode },
      });

      await staffCh.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          conversationId,
          callerId: me.id,
          callerName,
          mode,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to send ring notification:", error);
    } finally {
      try {
        supabase.removeChannel(ch);
        supabase.removeChannel(staffCh);
      } catch {}
    }
  }, [peerUserId, conversationId, me?.id, mode]);

  // Setup signaling channel
  useEffect(() => {
    if (!authChecked || !me?.id || !conversationId) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      console.log('📨 Received signal:', msg.kind);

      if (msg.kind === "webrtc-offer") {
        await answerCall(msg.sdp);
      } else if (msg.kind === "webrtc-answer") {
        const pc = pcRef.current;
        if (pc) {
          console.log("📞 Received answer, setting remote description...");
          await pc.setRemoteDescription(msg.sdp);
          console.log("✅ Remote description set, connection should establish soon...");
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
    });

    ch.subscribe((status) => {
      console.log(`📡 Channel subscription status: ${status}`);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setStatus("failed");
        setMediaError("Failed to establish signaling connection. Please try again.");
      }
    });
    
    threadChanRef.current = ch;

    return () => {
      console.log(`🔌 Cleaning up signaling channel: ${threadChannel}`);
      try {
        supabase.removeChannel(ch);
      } catch {}
      threadChanRef.current = null;
    };
  }, [authChecked, me?.id, conversationId, threadChannel, answerCall]);

  // Start call for caller
  useEffect(() => {
    if (!authChecked || !me?.id || role !== "caller") return;
    startCall();
  }, [authChecked, me?.id, role, startCall]);

  // Auto-accept for callee
  useEffect(() => {
    if (!authChecked || !me?.id || role !== "callee" || !autoAccept) return;
    setStatus("ringing");
  }, [authChecked, me?.id, role, autoAccept]);

  // End call
  const endCall = useCallback((fromPeer = false) => {
    console.log('📞 Ending call', { fromPeer });
    
    // Clear connection timeout
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clear remote stream
    remoteStreamRef.current = null;
    
    // Reset connection states
    setConnectionEstablished(false);
    setPeerConnected(false);
    
    // Send bye signal
    if (!fromPeer && peerUserId) {
      sendSignal({ kind: "bye", from: me?.id || "" });
    }
    
    setStatus("ended");
    callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
    
    // Redirect after a short delay
    setTimeout(() => {
      router.push(`/messages/${conversationId}`);
    }, 1000);
  }, [peerUserId, me?.id, sendSignal, conversationId, router]);

  // Controls
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    const newMutedState = !muted;
    
    audioTracks.forEach(track => {
      track.enabled = !newMutedState;
    });
    
    setMuted(newMutedState);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    const newCamOffState = !camOff;
    
    videoTracks.forEach(track => {
      track.enabled = !newCamOffState;
    });
    
    setCamOff(newCamOffState);
  }, [camOff]);

  // Show mode selector if no mode specified
  useEffect(() => {
    if (authChecked && me?.id && !mode) {
      setShowModeSelector(true);
    }
  }, [authChecked, me?.id, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle mode selection
  const handleModeSelection = useCallback((selectedMode: "audio" | "video") => {
    setShowModeSelector(false);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mode', selectedMode);
    window.history.replaceState({}, '', newUrl.toString());
  }, []);

  // Show mode selector
  if (showModeSelector) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-4">Select Call Mode</h2>
            <div className="space-y-4">
              <Button
                onClick={() => handleModeSelection("video")}
                className="w-full"
              >
                Video Call
              </Button>
              <Button
                onClick={() => handleModeSelection("audio")}
                variant="outline"
                className="w-full"
              >
                Audio Call
              </Button>
              <Button
                onClick={() => router.push(`/messages/${conversationId}`)}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
    );
  }

  // Show error state
  if (mediaError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-4">{mediaError}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.push(`/messages/${conversationId}`)}>
              Back to Messages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!authChecked || !me?.id) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
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
            <p className="text-sm text-gray-400">
              {peerInfo?.name || peerName || "Connecting..."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Button>
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
                {!peerConnected && (
                  <p className="text-yellow-400 text-sm mt-2">
                    ⚠️ Video screen will be available once connection is established
                  </p>
                )}
              </div>
            )}

            {/* Video Grid - Only show when connected */}
            {connectionEstablished && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Local Video */}
                <VideoTile
                  videoRef={localVideoRef}
                  label="You"
                  mirrored={true}
                  isLocal={true}
                  isConnected={connectionEstablished && peerConnected}
                  name={me.name || me.email}
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

            {/* Controls - Only show when connected */}
            {connectionEstablished && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={toggleMute}
                  variant={muted ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                  onClick={toggleCamera}
                  variant={camOff ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>

                <Button
                  onClick={() => endCall()}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Basic controls when not connected */}
            {!connectionEstablished && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => endCall()}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Audio Call</h2>
            <p className="text-gray-400 mb-6">
              {peerInfo?.name || peerName || "Remote"}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={toggleMute}
                variant={muted ? "destructive" : "secondary"}
                size="lg"
                className="rounded-full w-12 h-12"
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                onClick={() => endCall()}
                variant="destructive"
                size="lg"
                className="rounded-full w-12 h-12"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-gray-800 rounded-lg p-4 w-64">
          <h3 className="font-semibold mb-3">Settings</h3>
          <div className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => setShowAccessibilityHelp(true)}
              className="w-full justify-start"
            >
              Accessibility Help
            </Button>
            <div className="text-sm space-y-1">
              <div>Audio: {hasAudio ? "✅" : "❌"}</div>
              <div>Video: {hasVideo ? "✅" : "❌"}</div>
              <div>Checking: {isCheckingDevices ? "⏳" : "✅"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Help Modal */}
      {showAccessibilityHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Accessibility Help</h3>
            <div className="space-y-2 text-sm">
              <p>• Use Tab to navigate controls</p>
              <p>• Press Space to toggle mute</p>
              <p>• Press Enter to answer/end calls</p>
              <p>• Use arrow keys for volume control</p>
            </div>
            <Button
              onClick={() => setShowAccessibilityHelp(false)}
              className="w-full mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}