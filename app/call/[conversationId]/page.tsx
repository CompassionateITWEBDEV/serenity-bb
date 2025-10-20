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
    
    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoRef, label]);

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
        <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
          {name || label}
        </div>
        {isLocal && (
          <div className="rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur">
            You
          </div>
        )}
      </div>
      
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
        {/* Mute/Unmute with audio level indicator */}
        <div className="relative">
          <Button
            size="lg"
            variant={muted ? "destructive" : "secondary"}
            className="h-14 w-14 rounded-full"
            onClick={onToggleMute}
            disabled={hasAudio === false || isFallbackStream}
            title={isFallbackStream ? "No devices available" : hasAudio === false ? "No microphone available" : muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          {/* Audio level indicator */}
          {!muted && hasAudio && audioLevel && audioLevel > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 animate-pulse">
              <div 
                className="w-full h-full rounded-full bg-green-400"
                style={{ 
                  transform: `scale(${Math.min(audioLevel / 50, 1)})`,
                  opacity: Math.min(audioLevel / 30, 1)
                }}
              />
            </div>
          )}
        </div>

        {/* Camera On/Off (only for video calls) */}
        {mode === "video" && (
          <Button
            size="lg"
            variant={camOff ? "destructive" : "secondary"}
            className="h-14 w-14 rounded-full"
            onClick={onToggleCamera}
            disabled={hasVideo === false || isFallbackStream}
            title={isFallbackStream ? "No devices available" : hasVideo === false ? "No camera available" : camOff ? "Turn on camera" : "Turn off camera"}
          >
            {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}

        {/* Screen Share (only for video calls) */}
        {mode === "video" && (
          <Button
            size="lg"
            variant={isSharingScreen ? "default" : "secondary"}
            className="h-14 w-14 rounded-full"
            onClick={onShareScreen}
          >
            {isSharingScreen ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
          </Button>
        )}

        {/* End Call */}
        <Button
          size="lg"
          variant="destructive"
          className="h-16 w-16 rounded-full"
          onClick={onEndCall}
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

export default function CallRoomPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const role = (qs.get("role") as "caller" | "callee") || "caller";
  const mode = (qs.get("mode") as "audio" | "video") || "audio";
  const peerUserId = qs.get("peer") || "";
  const peerName = decodeURIComponent(qs.get("peerName") || "Peer");

  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<{ id: string; email?: string | null; name?: string; role?: UserRole } | null>(null);
  const [peerInfo, setPeerInfo] = useState<{ name: string; avatar?: string } | null>(null);

  type CallUIStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "failed";
  const [status, setStatus] = useState<CallUIStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [isFallbackStream, setIsFallbackStream] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const threadChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log("No audio tracks available for level monitoring");
      return;
    }
    
    console.log("Starting audio level monitoring with", audioTracks.length, "audio tracks");
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(localStreamRef.current);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        
        // Log when audio is detected
        if (average > 10) {
          console.log(`Audio level: ${average.toFixed(1)} (speaking detected)`);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.warn('Failed to start audio level monitoring:', error);
    }
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ---------- Auth and user info ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!alive) return;
        if (session.session?.user) {
          const user = session.session.user;
          try {
            const userRole = await determineUserRole(user.id);
            setMe({ 
              id: user.id, 
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              role: userRole
            });
            setAuthChecked(true);
            return;
          } catch (roleError) {
            console.error('Error determining user role:', roleError);
            // Fallback to patient role
            setMe({ 
              id: user.id, 
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              role: 'patient'
            });
            setAuthChecked(true);
            return;
          }
        }
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          try {
            const userRole = await determineUserRole(user.user.id);
            setMe({ 
              id: user.user.id, 
              email: user.user.email,
              name: user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'User',
              role: userRole
            });
            setAuthChecked(true);
            return;
          } catch (roleError) {
            console.error('Error determining user role:', roleError);
            // Fallback to patient role
            setMe({ 
              id: user.user.id, 
              email: user.user.email,
              name: user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'User',
              role: 'patient'
            });
            setAuthChecked(true);
            return;
          }
        }
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.user) {
          const user = refreshed.session.user;
          try {
            const userRole = await determineUserRole(user.id);
            setMe({ 
              id: user.id, 
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              role: userRole
            });
            setAuthChecked(true);
          } catch (roleError) {
            console.error('Error determining user role:', roleError);
            // Fallback to patient role
            setMe({ 
              id: user.id, 
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              role: 'patient'
            });
            setAuthChecked(true);
          }
        } else {
          // Keep next so user returns straight to the call if they log in
          const next = encodeURIComponent(location.pathname + location.search);
          router.replace(`/login?next=${next}`);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        // Redirect to login on any auth error
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);


  // Set peer info
  useEffect(() => {
    setPeerInfo({ name: peerName });
  }, [peerName]);

  // Function to ensure video elements are properly set up
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

    // Ensure recommended flags for autoplay
    try { video.muted = isLocal || video.muted; } catch {}
    try { video.playsInline = true; } catch {}
    try { (video as any).webkitPlaysInline = true; } catch {}
    try { video.autoplay = true; } catch {}
    try { video.controls = false; } catch {}

    // Clear existing source to prevent conflicts
    try { (video as any).srcObject = null; } catch {}
    try { video.load(); } catch {}

    // Set new source safely
    try { (video as any).srcObject = stream; } catch (err) {
      console.warn("Failed to attach MediaStream to video element:", err);
      return false;
    }

    // Safe play with proper error handling
    const playVideo = async () => {
      try {
        console.log(`🎬 Attempting to play ${isLocal ? 'local' : 'remote'} video:`, {
          readyState: video.readyState,
          paused: video.paused,
          srcObject: !!video.srcObject,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        if (video.readyState < 2) {
          console.log(`⏳ Waiting for video metadata to load...`);
          await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', resolve, { once: true });
            setTimeout(resolve, 2000); // Increased timeout
          });
        }
        
        if (video.paused) {
          await video.play();
          console.log(`✅ Video started playing for ${isLocal ? 'local' : 'remote'}`);
        } else {
          console.log(`▶️ Video already playing for ${isLocal ? 'local' : 'remote'}`);
        }
      } catch (err) {
        console.warn(`Failed to auto-play ${isLocal ? 'local' : 'remote'} video:`, err);
        // Try again after a short delay
        setTimeout(async () => {
          try {
            await video.play();
            console.log(`✅ Video started playing on retry for ${isLocal ? 'local' : 'remote'}`);
          } catch (retryErr) {
            console.warn(`Failed to play video on retry:`, retryErr);
          }
        }, 500);
      }
    };

    // Immediate setup and delayed play
    try { video.load(); } catch {}
    void playVideo();
    
    // Additional retry after delay
    setTimeout(() => {
      try { video.load(); } catch {}
      void playVideo();
    }, 500);

    return true;
  }, []);

  // Function to setup video element with retry
  const setupVideoElementWithRetry = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream | null, isLocal: boolean, maxRetries = 10, delayMs = 150) => {
    let retries = 0;

    const trySetup = () => {
      const ok = setupVideoElement(videoRef, stream, isLocal);
      if (ok) return true;
      if (retries >= maxRetries) {
        // Use warn instead of error to avoid Next.js intercepting as unhandled error
        console.warn(`❌ Failed to setup video element after ${maxRetries} retries`);
        return false;
      }
      retries++;
      console.log(`🔄 Retrying video setup (${retries}/${maxRetries})...`);
      setTimeout(trySetup, delayMs);
      return false;
    };

    return trySetup();
  }, [setupVideoElement]);

  // Ensure video elements are updated when streams change
  useEffect(() => {
    (async () => {
      if (!localStreamRef.current) return;
      const el = await waitForRef(localVideoRef);
      if (!el) return;
      setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
    })();
  }, [localStreamRef.current, setupVideoElement]);

  useEffect(() => {
    (async () => {
      if (!remoteStreamRef.current) return;
      const el = await waitForRef(remoteVideoRef);
      if (!el) return;
      setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
    })();
  }, [remoteStreamRef.current, setupVideoElement]);

  // Simple video display when connected
  useEffect(() => {
    (async () => {
      if (!(status === "connected" && remoteStreamRef.current)) return;
      const el = await waitForRef(remoteVideoRef);
      if (!el) return;
      console.log('🎯 Connection established - setting up remote video...');
      setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
    })();
  }, [status, setupVideoElement]);

  // Debug status changes and force UI updates
  useEffect(() => {
    console.log('📞 Status changed to:', status);
    
    // Force UI update when status changes to connected
    if (status === "connected") {
      console.log('🔄 Call connected - refreshing video elements');
      // Force re-render of video elements
      if (localVideoRef.current && localStreamRef.current) {
        console.log('🎥 Setting up local video on connect');
        setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        console.log('🎥 Setting up remote video on connect');
        setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
      }
      
      // Additional refresh after a short delay to ensure video elements are ready
      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          console.log('🔄 Delayed local video setup');
          setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          console.log('🔄 Delayed remote video setup');
          setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
        }
      }, 1000);
      
      // Force video refresh to fix black screen issues
      setTimeout(() => {
        console.log('🔄 Force refreshing video elements to fix black screen');
        if (localVideoRef.current && localStreamRef.current) {
          const video = localVideoRef.current;
          video.srcObject = null;
          video.load();
          setTimeout(() => {
            video.srcObject = localStreamRef.current;
            video.play().catch(console.warn);
          }, 100);
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          const video = remoteVideoRef.current;
          video.srcObject = null;
          video.load();
          setTimeout(() => {
            video.srcObject = remoteStreamRef.current;
            video.play().catch(console.warn);
          }, 100);
        }
      }, 2000);
    }
  }, [status, setupVideoElement]);

  // Ensure local video is displayed for both caller and callee (like patient code)
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      console.log('🎯 Setting up local video for both caller and callee...');
      setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
      
      // Single retry attempt to avoid AbortError
      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          console.log('🔄 Single retry for local video (1000ms)');
          setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
        }
      }, 1000);
    }
  }, [localStreamRef.current, setupVideoElement]);

  // Comprehensive video call initialization
  useEffect(() => {
    if (!authChecked || !me?.id) return;
    
    console.log('🚀 Initializing comprehensive video call system...', {
      role,
      mode,
      conversationId,
      peerUserId
    });
    
    // Initialize video elements immediately
    const initVideoElements = () => {
      const localEl = localVideoRef.current;
      const remoteEl = remoteVideoRef.current;
      
      if (localEl) {
        console.log('✅ Local video element initialized');
        localEl.muted = true;
        localEl.playsInline = true;
        localEl.autoplay = true;
        localEl.controls = false;
        // Ensure video element is ready
        localEl.addEventListener('loadedmetadata', () => {
          console.log('✅ Local video metadata loaded');
        });
      } else {
        console.warn('⚠️ Local video element not found');
      }
      
      if (remoteEl) {
        console.log('✅ Remote video element initialized');
        remoteEl.muted = false;
        remoteEl.playsInline = true;
        remoteEl.autoplay = true;
        remoteEl.controls = false;
        // Ensure video element is ready
        remoteEl.addEventListener('loadedmetadata', () => {
          console.log('✅ Remote video metadata loaded');
        });
      } else {
        console.warn('⚠️ Remote video element not found');
      }
    };
    
    // Initialize immediately and retry if needed
    initVideoElements();
    setTimeout(initVideoElements, 100);
    setTimeout(initVideoElements, 500);
    
    getAvailableDevices();
    
    // Request permissions and prepare for call
    const prepareCall = async () => {
      try {
        console.log('🔐 Preparing call permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: mode === "video" 
        });
        console.log('✅ Call permissions granted');
        
        // Store the stream for immediate use
        localStreamRef.current = stream;
        
        // Set up local video immediately
        const localEl = localVideoRef.current;
        if (localEl) {
          localEl.srcObject = stream;
          localEl.play().catch(console.warn);
          console.log('✅ Local video set up immediately');
        }
        
        // Don't stop the stream - keep it for the call
      } catch (error) {
        console.warn("⚠️ Permission request failed:", error);
        setMediaError("Camera/microphone access denied. Please allow access and refresh the page.");
      }
    };
    
    // Start preparation after a short delay
    setTimeout(prepareCall, 1000);
    
    // Auto-transition from idle to connected after 3 seconds
    const autoConnectTimer = setTimeout(() => {
      if (status === "idle" && localStreamRef.current) {
        console.log('🔄 Auto-connecting after timeout');
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        startAudioLevelMonitoring();
      }
    }, 3000);
    
    return () => {
      clearTimeout(autoConnectTimer);
    };
  }, [authChecked, me?.id, mode, role, conversationId, peerUserId, status]);

  // Call duration timer and immediate video setup
  useEffect(() => {
    if (status === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      // Force immediate video setup when connected
      console.log('🎯 Call connected - forcing immediate video setup');
      const forceVideoSetup = () => {
        const localEl = localVideoRef.current;
        const remoteEl = remoteVideoRef.current;
        
        if (localEl && localStreamRef.current) {
          localEl.srcObject = localStreamRef.current;
          localEl.play().catch(console.warn);
          console.log('✅ Forced local video setup');
        }
        
        if (remoteEl && remoteStreamRef.current) {
          remoteEl.srcObject = remoteStreamRef.current;
          remoteEl.play().catch(console.warn);
          console.log('✅ Forced remote video setup');
        }
      };
      
      // Immediate setup
      forceVideoSetup();
      // Retry after short delay
      setTimeout(forceVideoSetup, 200);
      setTimeout(forceVideoSetup, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [status]);

  // ---------- WebRTC core ----------
  const ensurePC = useCallback(() => {
    try {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (ev) => {
      if (ev.candidate && me?.id) {
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: ev.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`🔗 PeerConnection state changed: ${s}`);
      if (s === "connected") {
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        startAudioLevelMonitoring();
        // Ensure video elements are set when fully connected
        if (localStreamRef.current) {
          setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
        }
        if (remoteStreamRef.current) {
          setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
          setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
        }
      } else if (s === "failed" || s === "closed") {
        setStatus("ended");
        callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
        stopAudioLevelMonitoring();
      } else if (s === "disconnected") {
        console.warn("⚠️ PeerConnection disconnected");
      }
    };

    // Add ICE connection state monitoring
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`🧊 ICE connection state: ${iceState}`);
      
      if (iceState === "connected" || iceState === "completed") {
        console.log("✅ ICE connection established");
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        startAudioLevelMonitoring();
        
        // Ensure video elements are set up when ICE connects
        if (localStreamRef.current) {
          (async () => {
            const el = await waitForRef(localVideoRef);
            if (el) setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
          })();
        }
        if (remoteStreamRef.current) {
          (async () => {
            const el = await waitForRef(remoteVideoRef);
            if (el) setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
          })();
        }
      } else if (iceState === "checking") {
        // Also set connected when ICE is checking (more aggressive)
        console.log("🔄 ICE checking - setting connected status");
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        startAudioLevelMonitoring();
      } else if (iceState === "failed") {
        console.error("❌ ICE connection failed - trying to restart ICE");
        // Try to restart ICE gathering
        pc.restartIce();
      } else if (iceState === "disconnected") {
        console.warn("⚠️ ICE disconnected");
      }
    };

    // Add ICE gathering state monitoring
    pc.onicegatheringstatechange = () => {
      console.log(`🧊 ICE gathering state: ${pc.iceGatheringState}`);
    };
    pc.ontrack = (ev) => {
      console.log(`📡 Received remote ${ev.track.kind} track:`, ev.track.label);
      
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        console.log('🆕 Created new remote stream');
      }
      
      // Remove existing tracks of the same kind to avoid duplicates
      const existingTracks = remoteStreamRef.current.getTracks().filter(t => t.kind === ev.track.kind);
      existingTracks.forEach(track => {
        remoteStreamRef.current!.removeTrack(track);
        track.stop();
      });
      
      remoteStreamRef.current.addTrack(ev.track);
      console.log(`✅ Added ${ev.track.kind} track to remote stream. Total tracks:`, {
        audio: remoteStreamRef.current.getAudioTracks().length,
        video: remoteStreamRef.current.getVideoTracks().length
      });
      
      // ULTRA-AGGRESSIVE remote video setup for mobile/Vercel
      const setupRemoteVideo = () => {
        const remoteEl = remoteVideoRef.current;
        if (remoteEl) {
          console.log('🎥 ULTRA-AGGRESSIVE remote video setup for mobile...');
          
          // Force clear everything
          remoteEl.srcObject = null;
          remoteEl.load();
          
          // Wait a bit then set stream
          setTimeout(() => {
            remoteEl.srcObject = remoteStreamRef.current;
            remoteEl.muted = false;
            remoteEl.playsInline = true;
            remoteEl.autoplay = true;
            
            // Force play immediately
            remoteEl.play().catch(console.warn);
            console.log(`✅ Remote video stream set with ${ev.track.kind} track`);
            
            // Multiple aggressive play attempts
            const forcePlay = () => {
              if (remoteEl.paused || remoteEl.videoWidth === 0) {
                remoteEl.play().catch(console.warn);
                console.log('🔄 Aggressive remote video play attempt');
              }
            };
            
            // Try every 100ms for 2 seconds
            for (let i = 0; i < 20; i++) {
              setTimeout(forcePlay, i * 100);
            }
            
            // Additional retry with stream refresh
            setTimeout(() => {
              if (remoteEl.videoWidth === 0 || remoteEl.paused) {
                console.log('🔄 Mobile remote video retry with stream refresh...');
                remoteEl.srcObject = null;
                remoteEl.load();
                setTimeout(() => {
                  remoteEl.srcObject = remoteStreamRef.current;
                  remoteEl.play().catch(console.warn);
                  
                  // More aggressive play attempts
                  for (let i = 0; i < 10; i++) {
                    setTimeout(() => {
                      if (remoteEl.paused) {
                        remoteEl.play().catch(console.warn);
                      }
                    }, i * 200);
                  }
                }, 200);
              }
            }, 2000);
            
          }, 50);
        } else {
          console.warn('⚠️ Remote video element not ready, retrying...');
          setTimeout(setupRemoteVideo, 100);
        }
      };
      
      setupRemoteVideo();
    };

      pcRef.current = pc;
      return pc;
    } catch (error) {
      console.warn('⚠️ ensurePC error:', error);
      // Return a dummy PC to prevent further errors
      const dummy = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = dummy;
      return dummy;
    }
  }, [me?.id]);

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

  // Toggle speaker on/off
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
    // Note: In a real implementation, you might want to control actual audio output
    // This is a UI-only toggle for now
  }, []);

  // Handle call mode selection
  const handleModeSelection = useCallback((selectedMode: "audio" | "video") => {
    setShowModeSelector(false);
    // Update the URL to reflect the selected mode
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mode', selectedMode);
    window.history.replaceState({}, '', newUrl.toString());
    // The component will re-render with the new mode
  }, []);

  // Show mode selector if no mode is specified or if devices are not available
  useEffect(() => {
    if (authChecked && me?.id && !showModeSelector) {
      // If no mode is specified in URL, show mode selector
      if (!qs.get("mode")) {
        setShowModeSelector(true);
      }
      // If video mode is selected but no camera is available, suggest audio mode
      else if (mode === "video" && hasVideo === false && hasAudio === true) {
        setShowModeSelector(true);
      }
    }
  }, [authChecked, me?.id, mode, hasVideo, hasAudio, qs, showModeSelector]);

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
    setIsCheckingDevices(true);
    try {
      // First, try to get user media to trigger permission request
      // This often helps detect devices that weren't visible before
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        });
        testStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.log("Test stream failed (this is normal):", error);
      }
      
      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("All detected devices:", devices);
      
      // Filter and log audio devices specifically
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log("Audio input devices:", audioDevices);
      console.log("Video input devices:", videoDevices);
      
      setAvailableDevices(devices);
      return devices;
    } catch (error) {
      console.warn("Failed to enumerate devices:", error);
      return [];
    } finally {
      setIsCheckingDevices(false);
    }
  }, []);

  // Enhanced media stream acquisition with flexible device handling
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setMediaError(null);
      
      console.log('=== GETTING MEDIA STREAM ===');
      console.log('Mode:', mode);
      
      // First, try to get available devices
      const devices = await getAvailableDevices();
      
      // Check what devices are available
      const audioAvailable = devices.some(device => device.kind === 'audioinput');
      const videoAvailable = devices.some(device => device.kind === 'videoinput');
      
      // Update state for UI
      setHasAudio(audioAvailable);
      setHasVideo(videoAvailable);
      
      console.log("Available devices:", { hasAudio: audioAvailable, hasVideo: videoAvailable, mode });
      console.log("Device list:", devices.map(d => ({ kind: d.kind, label: d.label })));
      
      // For video calls, always allow the call even without devices
      if (mode === "video" && !audioAvailable && !videoAvailable) {
        console.log("No devices available for video call, creating fallback stream");
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('No Camera', 160, 120);
        }
        
        const stream = canvas.captureStream(30);
        setIsFallbackStream(true);
        return stream;
      }
      
      // Build constraints based on what's available and what's needed
      let constraints: MediaStreamConstraints = {};
      
      if (mode === "video") {
        // For video calls, prioritize video, audio is optional
        if (videoAvailable) {
          constraints.video = { 
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          };
        } else {
          // No camera available, but still allow video call (audio only)
          console.warn("No camera found, proceeding with audio-only video call");
          constraints.video = false;
        }
        
        // Audio is optional for video calls
        if (audioAvailable) {
          constraints.audio = { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          };
        } else {
          console.warn("No microphone found, proceeding without audio input");
          constraints.audio = false;
        }
      } else {
        // For audio calls, try to get audio, but allow fallback if none available
        if (audioAvailable) {
          constraints.audio = { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          };
        } else {
          console.warn("No microphone found for audio call, creating fallback");
          // Create a silent audio stream for audio calls without microphone
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Create a silent audio stream
            oscillator.connect(gainNode);
            gainNode.gain.value = 0; // Silent
            oscillator.frequency.value = 440; // A4 note
            oscillator.start();
            
            // Create a MediaStream from the audio context
            const destination = audioContext.createMediaStreamDestination();
            oscillator.connect(destination);
            
            const stream = destination.stream;
            setIsFallbackStream(true);
            return stream;
          } catch (error) {
            console.warn("Failed to create audio fallback, using video fallback instead");
            // If audio context fails, create a video stream instead
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, 320, 240);
              ctx.fillStyle = '#ffffff';
              ctx.font = '16px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('No Microphone', 160, 120);
            }
            
            const stream = canvas.captureStream(30);
            setIsFallbackStream(true);
            return stream;
          }
        }
        
        constraints.video = false;
      }
      
      // If no devices are available at all, handle gracefully
      if (!audioAvailable && !videoAvailable) {
        console.warn("No audio or video devices found");
        
        // For video calls without any devices, we can still create a call
        // The peer will see a black video feed or avatar
        if (mode === "video") {
          // Create a minimal video stream using canvas
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 320, 240);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No Camera', 160, 120);
          }
          
          const stream = canvas.captureStream(30); // 30 FPS
          setIsFallbackStream(true);
          return stream;
        } else {
          // For audio calls, we need at least some audio capability
          throw new Error("No microphone found. Audio calls require a microphone. Please connect a microphone or switch to video call.");
        }
      }
      
      // Try the main constraints first
      try {
        console.log('🎯 Trying main constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media stream acquired with main constraints:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
          audioTrackLabels: stream.getAudioTracks().map(t => t.label),
          videoTrackLabels: stream.getVideoTracks().map(t => t.label),
        streamId: stream.id,
        active: stream.active
      });
      
      // Ensure all tracks are enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log(`🔊 Audio track enabled: ${track.label}`);
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = true;
        console.log(`📹 Video track enabled: ${track.label}`);
      });
      
      return stream;
      } catch (error: any) {
        console.warn("❌ Main constraints failed, trying basic constraints:", error);
        
        // Try with basic constraints
        const basicConstraints: MediaStreamConstraints = {};
        if (mode === "video") {
          basicConstraints.video = true;
          basicConstraints.audio = true;
        } else {
          basicConstraints.audio = true;
          basicConstraints.video = false;
        }
        
        try {
          console.log('🎯 Trying basic constraints:', basicConstraints);
          const basicStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          console.log('✅ Media stream acquired with basic constraints:', {
            audioTracks: basicStream.getAudioTracks().length,
            videoTracks: basicStream.getVideoTracks().length,
            streamId: basicStream.id,
            active: basicStream.active
          });
          
          // Ensure all tracks are enabled
          basicStream.getAudioTracks().forEach(track => {
            track.enabled = true;
            console.log(`🔊 Audio track enabled: ${track.label}`);
          });
          basicStream.getVideoTracks().forEach(track => {
            track.enabled = true;
            console.log(`📹 Video track enabled: ${track.label}`);
          });
          
          return basicStream;
        } catch (basicError: any) {
          console.warn("❌ Basic constraints also failed:", basicError);

          // Targeted retry for localhost: iterate devices and try explicit deviceId
          try {
            const all = await navigator.mediaDevices.enumerateDevices();
            const cams = all.filter((d) => d.kind === "videoinput");
            const mics = all.filter((d) => d.kind === "audioinput");

            for (const cam of cams) {
              const deviceConstraints: MediaStreamConstraints = {
                video: { deviceId: { exact: cam.deviceId } },
                audio: mics.length ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
              };
              try {
                console.log('🎯 Trying explicit deviceId for camera:', cam.label || cam.deviceId);
                const s = await navigator.mediaDevices.getUserMedia(deviceConstraints);
                console.log('✅ Media stream acquired with explicit deviceId');
                setIsFallbackStream(false);
                return s;
              } catch (perDeviceErr: any) {
                console.warn('⚠️ Device-specific getUserMedia failed:', perDeviceErr?.name || perDeviceErr?.message || perDeviceErr);
                // Continue trying other devices
              }
            }

            // Final fallback for localhost: canvas stream so the call can proceed
            console.warn('⚠️ Falling back to canvas video stream');
            const canvas = document.createElement('canvas');
            canvas.width = 320; canvas.height = 240;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 320, 240);
              ctx.fillStyle = '#ffffff'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
              ctx.fillText('Camera unavailable', 160, 120);
            }
            const fallback = canvas.captureStream(24);
            setIsFallbackStream(true);
            return fallback;
          } catch (retryErr) {
            console.warn('⚠️ Localhost retry path failed:', retryErr);
            throw error; // Throw the original error if all retries fail
          }
        }
      }
    } catch (error: any) {
      console.error("Media access error:", error);
      
      let errorMessage = "Unable to access camera or microphone.";
      
      if (error.name === "NotAllowedError" || error.message?.includes("Permission denied")) {
        errorMessage = "Camera and microphone access denied. Please look for the camera/microphone icon in your browser's address bar, click it, and select 'Allow' for both camera and microphone, then refresh the page.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera or microphone found. Please connect your devices and try again.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone is being used by another application. Please close other apps and try again.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera or microphone doesn't support the required settings. Trying with basic settings...";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMediaError(errorMessage);
      setStatus("failed");
      throw error;
    }
  }, [mode, getAvailableDevices]);

  // ---------- Signaling on thread_${conversationId} ----------
  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    try {
      if (!threadChanRef.current) {
        console.warn('⚠️ Cannot send signal: channel not available');
        return;
      }
      console.log(`📤 Sending signal:`, payload);
      threadChanRef.current.send({ type: "broadcast", event: "signal", payload })
        .then(() => {
          console.log(`✅ Signal sent successfully:`, payload.kind);
        })
        .catch((error) => {
          console.warn(`⚠️ Failed to send signal:`, error);
        });
    } catch (error) {
      console.warn('⚠️ sendSignal error:', error);
    }
  }, []);

  // Helper: wait for a ref to mount before using it
  const waitForRef = useCallback(async <T,>(ref: React.RefObject<T>, tries = 20, delay = 150): Promise<T | null> => {
    for (let i = 0; i < tries; i++) {
      if (ref.current) return ref.current;
      if (i <= 2) { // Only log first few attempts
        console.log(`⏳ Waiting for video element (attempt ${i + 1}/${tries})...`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
    console.warn('⚠️ Video element not found within timeout');
    return null;
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    console.log(`🔗 Setting up signaling channel: ${threadChannel} for user: ${me.id}`);

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      console.log(`📨 Received signal:`, msg);
      
      if (!msg || msg.from === me.id) {
        console.log(`⏭️ Ignoring signal from self or invalid message`);
        return;
      }

      if (msg.kind === "webrtc-offer") {
        // Prevent redundant processing
        if (callProcessed) {
          console.log('⏭️ Call already processed, ignoring duplicate offer');
          return;
        }
        
        console.log('📞 Received offer from peer, answering immediately...');
        setCallProcessed(true); // Mark as processed
        
        try {
          // Both participants are already ready with streams, just handle the offer
        const pc = ensurePC();
        // Ensure callee has local media tracks before answering
        if (!localStreamRef.current) {
          console.log('🎤 Callee acquiring media now (call accepted)...');
          setStatus("connecting"); // Show connecting only when actually accepting
          try {
            localStreamRef.current = await getMediaStream();
            // Wait for video element to mount before setup
            const el = await waitForRef(localVideoRef);
            if (el) {
              setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
            }
            localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
            console.log('✅ Callee media acquired and tracks added');
          } catch (e) {
            console.warn('⚠️ Failed to acquire local media before answer:', e);
            setStatus("failed");
            setMediaError("Failed to access camera/microphone. Please try again.");
            setCallProcessed(false); // Reset on error
            return;
          }
        }
          
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });
          
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
        console.log('✅ Answer sent');
        
        // Immediately transition to connected after sending answer
        console.log('🔄 Callee: transitioning to connected after answer sent');
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        startAudioLevelMonitoring();
        
        // Comprehensive video setup for callee
        const setupCalleeVideo = () => {
          // Local video setup
          if (localStreamRef.current) {
            const localEl = localVideoRef.current;
            if (localEl) {
              localEl.srcObject = localStreamRef.current;
              localEl.play().catch(console.warn);
              console.log('✅ Callee local video set up immediately');
            }
          }
          
          // Remote video setup - force immediate display
          if (remoteStreamRef.current) {
            const remoteEl = remoteVideoRef.current;
            if (remoteEl) {
              console.log('🎥 Callee setting up remote video immediately...');
              remoteEl.srcObject = remoteStreamRef.current;
              remoteEl.play().catch(console.warn);
              console.log('✅ Callee remote video set up immediately');
              
              // Force play multiple times
              setTimeout(() => {
                if (remoteEl.paused) {
                  remoteEl.play().catch(console.warn);
                  console.log('🔄 Forced callee remote video play');
                }
              }, 200);
            }
          }
        };
        
        setupCalleeVideo();
        // Multiple retries to ensure video works
        setTimeout(setupCalleeVideo, 500);
        setTimeout(setupCalleeVideo, 1000);
        setTimeout(setupCalleeVideo, 2000);
        
        // Additional fallback for ICE connection issues
        setTimeout(() => {
          if (status !== "connected") {
            console.log('🔄 Callee fallback: forcing connected status');
            setStatus("connected");
            callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
            startAudioLevelMonitoring();
          }
        }, 1000);
        
        // Prevent further offer processing once connected
        setTimeout(() => {
          if (status === "connected") {
            setCallProcessed(true);
          }
        }, 3000);
        } catch (error) {
          console.error('❌ Failed to handle offer:', error);
          setStatus("failed");
          setMediaError("Failed to establish connection. Please try again.");
        }
      } else if (msg.kind === "webrtc-answer") {
        console.log('📞 Received answer from peer');
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        console.log('✅ Remote description set');
      } else if (msg.kind === "webrtc-ice") {
        try {
          const pc = ensurePC();
          console.log(`🧊 Adding ICE candidate:`, msg.candidate);
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          console.log(`✅ ICE candidate added successfully`);
        } catch (error) {
          console.warn(`⚠️ Failed to add ICE candidate:`, error);
          // Don't ignore - this might be important for connection
        }
      } else if (msg.kind === "bye") {
        console.log('📞 Received bye from peer');
        setCallProcessed(false); // Reset for next call
        endCall(true);
      }
    });

    // Add subscription status monitoring
    ch.subscribe((status) => {
      console.log(`📡 Channel subscription status: ${status}`);
      if (status === "SUBSCRIBED") {
        console.log(`✅ Successfully subscribed to channel: ${threadChannel}`);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`❌ Channel subscription failed: ${status}`);
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
  }, [conversationId, ensurePC, me?.id, sendSignal, threadChannel, mode, setupVideoElementWithRetry, getMediaStream, connectionTimeout]);

  // ---------- Ring peer (for IncomingCallBanner) on user_${peer} ----------
  async function ringPeer() {
    if (!peerUserId || !conversationId || !me?.id) return;
    
    // Get caller info for better notification
    const callerName = me.name || me.email || "Caller";
    const callerAvatar = null; // Avatar not available in current user object
    
    // Send to both old format (for compatibility) and new staff-specific format
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    const staffCh = supabase.channel(`staff-calls-${peerUserId}`, { config: { broadcast: { ack: true } } });
    
    try {
      // Subscribe to both channels
      await Promise.all([
        new Promise<void>((res, rej) => {
      const to = setTimeout(() => rej(new Error("subscribe timeout")), 8000);
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
          const to = setTimeout(() => rej(new Error("staff subscribe timeout")), 8000);
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

      // Send old format for compatibility
    await ch.send({
      type: "broadcast",
      event: "invite",
        payload: { conversationId, fromId: me.id, fromName: callerName, mode },
      });

      // Send new staff-specific format
      await staffCh.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          conversationId,
          callerId: me.id,
          callerName,
          callerAvatar,
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
  }

  async function byePeer() {
    if (!peerUserId || !conversationId) return;
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    await new Promise<void>((res) => ch.subscribe((s) => s === "SUBSCRIBED" && res()));
    await ch.send({ type: "broadcast", event: "bye", payload: { conversationId } });
    try {
      supabase.removeChannel(ch);
    } catch {}
  }

  // ---------- Start flow ----------
  const startOrPrep = useCallback(async () => {
    if (!me?.id) return;

    // Caller shows ringing until callee answers; callee stays idle and prepares
    if (role !== "caller") {
      // Callee shows idle and waits
      setMediaError(null);
    } else {
      setStatus("connecting");
      setMediaError(null);
    }
    setMediaError(null);

    // Log call initiation (non-blocking)
    callTracker.logCallEvent({
      conversationId: conversationId!,
      callerId: me.id,
      calleeId: peerUserId,
      callerName: me.name || me.email || "Caller",
      calleeName: peerInfo?.name || peerName,
      callType: mode,
      status: "initiated",
      startedAt: new Date().toISOString(),
    }).catch(console.warn);

    try {
      // 1) Get local stream with enhanced error handling
      localStreamRef.current = await getMediaStream();
      console.log('Local stream acquired:', {
        audioTracks: localStreamRef.current.getAudioTracks().length,
        videoTracks: localStreamRef.current.getVideoTracks().length,
        streamId: localStreamRef.current.id
      });
      
      // Set the video element source using the setup function
      setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);

    // 2) Add tracks to PC
    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => {
      console.log(`Adding ${t.kind} track to peer connection:`, t.label);
      pc.addTrack(t, localStreamRef.current!);
    });

      // Comprehensive caller video setup
      console.log('🎯 Setting up caller video system...');
      const setupCallerVideo = () => {
        const localEl = localVideoRef.current;
        if (localEl && localStreamRef.current) {
          localEl.srcObject = localStreamRef.current;
          localEl.play().catch(console.warn);
          console.log('✅ Caller local video set up immediately');
        }
        
        // Also prepare for remote video
        const remoteEl = remoteVideoRef.current;
        if (remoteEl && remoteStreamRef.current) {
          remoteEl.srcObject = remoteStreamRef.current;
          remoteEl.play().catch(console.warn);
          console.log('✅ Caller remote video set up immediately');
        }
      };
      
      setupCallerVideo();
      // Retry to ensure video elements are ready
      setTimeout(setupCallerVideo, 300);

      // 3) Simple call flow like Messenger/Zoom
    if (role === "caller") {
        // Caller shows ringing until callee answers
      setStatus("ringing");
      callTracker.updateCallStatus(conversationId!, "ringing").catch(console.warn);
      
        console.log('🎯 Creating WebRTC offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
        
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      await ringPeer(); // show IncomingCallBanner on the peer
        
        console.log('✅ Caller sent offer, waiting for answer...');
      } else {
        // Callee shows idle and waits
        console.log('📞 Callee ready and waiting for offer...');
    }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
      // Don't throw - let the UI handle the error state
    }
  }, [ensurePC, getMediaStream, me?.id, mode, role, sendSignal, conversationId, peerUserId, peerInfo?.name, peerName]);

  // Main caller effect: only start for caller
  useEffect(() => {
    if (!authChecked || !me?.id) return;
    if (role !== "caller") return;
    (async () => { await startOrPrep(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, me?.id, role]);

  // Prevent redundant call processing - track if already handled
  const [callProcessed, setCallProcessed] = useState(false);

  // Cleanup connection timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      setCallProcessed(false); // Reset call state on unmount
    };
  }, [connectionTimeout]);

  // ---------- Controls ----------
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) {
      console.warn("No local stream available for mute toggle");
      return;
    }
    
    const audioTracks = s.getAudioTracks();
    console.log(`Toggling mute for ${audioTracks.length} audio tracks`);
    
    if (audioTracks.length === 0) {
      console.warn("No audio tracks found in local stream");
      return;
    }
    
    const newMutedState = !muted;
    audioTracks.forEach((t) => {
      t.enabled = !newMutedState;
      console.log(`Audio track ${t.label} enabled: ${t.enabled}`);
    });
    
    setMuted(newMutedState);
    console.log(`Mute state changed to: ${newMutedState}`);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) {
      console.warn("No local stream available for camera toggle");
      return;
    }
    
    const videoTracks = s.getVideoTracks();
    console.log(`Toggling camera for ${videoTracks.length} video tracks`);
    
    if (videoTracks.length === 0) {
      console.warn("No video tracks found in local stream");
      return;
    }
    
    const newCamOffState = !camOff;
    videoTracks.forEach((t) => {
      t.enabled = !newCamOffState;
      console.log(`Video track ${t.label} enabled: ${t.enabled}`);
    });
    
    setCamOff(newCamOffState);
    console.log(`Camera state changed to: ${newCamOffState ? 'off' : 'on'}`);
    
    // Force video element refresh when camera state changes for flexibility
    setTimeout(() => {
      if (localVideoRef.current && localStreamRef.current) {
        const video = localVideoRef.current;
        video.srcObject = null;
        video.load();
        setTimeout(() => {
          video.srcObject = localStreamRef.current;
          video.play().catch(console.warn);
          console.log('🔄 Local video refreshed after camera toggle');
        }, 100);
      }
    }, 200);
  }, [camOff]);

  const shareScreen = useCallback(async () => {
    if (isSharingScreen) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsSharingScreen(false);
      
      // Switch back to camera
      const pc = pcRef.current;
      if (pc && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        screenStreamRef.current = screenStream;
        setIsSharingScreen(true);
        
        // Replace video track with screen share
        const pc = pcRef.current;
        if (pc) {
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(videoTrack);
            }
          }
        }
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsSharingScreen(false);
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
          }
          
          // Switch back to camera
          const pc = pcRef.current;
          if (pc && localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
              const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
              if (sender) {
                sender.replaceTrack(videoTrack);
              }
            }
          }
        });
      } catch (error) {
        console.error('Screen sharing failed:', error);
      }
    }
  }, [isSharingScreen]);

  const endCall = useCallback(
    (remote = false) => {
      setStatus("ended");
      
      // Track call ending (non-blocking)
      callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
      
      // Stop audio level monitoring
      stopAudioLevelMonitoring();
      
      // Clear call timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      
      try {
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      } catch {}
      try {
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;
      
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;
      
      try {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      screenStreamRef.current = null;

      // notify via thread + user channel
      if (!remote && me?.id) {
        sendSignal({ kind: "bye", from: me.id });
        void byePeer();
      }

      // back to messages - redirect based on user role
      const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
      router.push(messagesUrl);
    },
    [byePeer, me?.id, router, sendSignal, conversationId]
  );

  useEffect(() => {
    const onUnload = () => endCall(false);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      stopAudioLevelMonitoring();
    };
  }, [endCall, stopAudioLevelMonitoring]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Retry function for media access
  const retryMediaAccess = useCallback(async () => {
    setMediaError(null);
    setStatus("connecting");
    try {
      await startOrPrep();
    } catch (error) {
      console.error("Retry failed:", error);
    }
  }, [startOrPrep]);

  // Request permissions explicitly
  const requestPermissions = useCallback(async () => {
    try {
      setMediaError(null);
      setStatus("connecting");
      
      // Request permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: mode === "video" 
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      // Refresh device list after getting permissions
      await getAvailableDevices();
      
      // Now try the actual call
      await startOrPrep();
    } catch (error) {
      console.error("Permission request failed:", error);
      setStatus("failed");
      setMediaError("Permission denied. Please allow camera and microphone access and try again.");
    }
  }, [mode, startOrPrep, getAvailableDevices]);

  // Refresh devices function
  const refreshDevices = useCallback(async () => {
    try {
      setMediaError(null);
      setStatus("connecting");
      
      // Force refresh device list
      await getAvailableDevices();
      
      // Try to start the call again
      await startOrPrep();
    } catch (error) {
      console.error("Device refresh failed:", error);
      setStatus("failed");
      setMediaError("Failed to refresh devices. Please check your connections and try again.");
    }
  }, [getAvailableDevices, startOrPrep]);

  // Test audio function
  const testAudio = useCallback(async () => {
    try {
      console.log('🎤 Starting audio test...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Audio test successful:', {
        audioTracks: stream.getAudioTracks().length,
        trackLabels: stream.getAudioTracks().map(t => t.label),
        streamId: stream.id,
        active: stream.active
      });
      
      // Test if we can assign to local video element
      if (localVideoRef.current) {
        console.log('🎥 Testing audio assignment to local video element');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = false;
        
        try {
          await localVideoRef.current.play();
          console.log('✅ Audio playing through video element');
          alert('✅ Audio test successful! You should hear yourself. Check the video element for 3 seconds.');
          
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
            if (localStreamRef.current) {
              localVideoRef.current!.srcObject = localStreamRef.current;
            }
            console.log('🔄 Restored original stream');
          }, 3000);
        } catch (playError) {
          console.error('❌ Audio playback failed:', playError);
          alert('❌ Audio test failed to play: ' + playError);
          stream.getTracks().forEach(track => track.stop());
        }
      } else {
        console.error('❌ localVideoRef.current is null');
        alert('❌ Video element not found');
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('❌ Audio test failed:', error);
      alert('❌ Audio test failed. Please check your microphone permissions and try again.');
    }
  }, []);

  // Test video function
  const testVideo = useCallback(async () => {
    try {
      console.log('Starting video test...');
      
      // First check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Test with basic constraints first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      console.log('Video test successful:', {
        videoTracks: stream.getVideoTracks().length,
        trackLabels: stream.getVideoTracks().map(t => t.label),
        streamId: stream.id,
        active: stream.active
      });
      
      // Test setting the video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        console.log('🎥 Video element updated with test stream');
        
        // Force play
        localVideoRef.current.play().catch(err => {
          console.warn('Failed to auto-play test video:', err);
        });
        
        // Wait a moment to see if video loads
        setTimeout(() => {
          if (localVideoRef.current) {
            console.log('📊 Video element state:', {
              videoWidth: localVideoRef.current.videoWidth,
              videoHeight: localVideoRef.current.videoHeight,
              readyState: localVideoRef.current.readyState,
              srcObject: !!localVideoRef.current.srcObject,
              paused: localVideoRef.current.paused,
              muted: localVideoRef.current.muted
            });
          }
        }, 1000);
        
        // Stop the test stream after 5 seconds
        setTimeout(() => {
          stream.getTracks().forEach(track => track.stop());
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }, 5000);
        
        alert('Video test successful! Your camera is working. Check the video preview for 5 seconds.');
      } else {
        console.error('localVideoRef.current is null');
        alert('Video test failed: Video element not found');
      }
    } catch (error: any) {
      console.error('Video test failed:', error);
      let errorMsg = 'Video test failed: ';
      
      if (error.name === 'NotAllowedError') {
        errorMsg += 'Permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMsg += 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMsg += 'Camera is being used by another application. Please close other apps and try again.';
      } else {
        errorMsg += error.message || 'Unknown error occurred.';
      }
      
      alert(errorMsg);
    }
  }, []);

  // Debug function to refresh video streams
  const refreshVideoStreams = useCallback(() => {
    console.log('🔄 Manually refreshing video streams...');
    
    if (localVideoRef.current && localStreamRef.current) {
      console.log('🔄 Refreshing local video');
      const video = localVideoRef.current;
      video.srcObject = null;
      video.load();
      setTimeout(() => {
        video.srcObject = localStreamRef.current;
        video.play().catch(console.warn);
      }, 100);
    }
    
    if (remoteVideoRef.current && remoteStreamRef.current) {
      console.log('🔄 Refreshing remote video');
      const video = remoteVideoRef.current;
      video.srcObject = null;
      video.load();
      setTimeout(() => {
        video.srcObject = remoteStreamRef.current;
        video.play().catch(console.warn);
      }, 100);
    }
  }, []);

  // ULTRA-AGGRESSIVE video refresh system for mobile/Vercel
  useEffect(() => {
    if (status !== "connected") return;
    
    console.log('🔄 ULTRA-AGGRESSIVE video refresh for mobile/Vercel...');
    
    // Continuous refresh for mobile - runs every 2 seconds
    const mobileRefreshInterval = setInterval(() => {
      const localVideo = localVideoRef.current;
      const remoteVideo = remoteVideoRef.current;
      
      console.log('🔄 Mobile continuous video refresh...');
      
      // Local video refresh
      if (localVideo && localStreamRef.current) {
        if (!localVideo.srcObject || localVideo.videoWidth === 0) {
          console.log('🔄 Mobile: Refreshing local video...');
          localVideo.srcObject = null;
          localVideo.load();
          setTimeout(() => {
            localVideo.srcObject = localStreamRef.current;
            localVideo.play().catch(console.warn);
          }, 100);
        }
      }
      
      // Remote video refresh - ULTRA-AGGRESSIVE for mobile
      if (remoteVideo && remoteStreamRef.current) {
        if (!remoteVideo.srcObject || remoteVideo.videoWidth === 0) {
          console.log('🔄 Mobile: ULTRA-AGGRESSIVE remote video refresh...');
          remoteVideo.srcObject = null;
          remoteVideo.load();
          setTimeout(() => {
            remoteVideo.srcObject = remoteStreamRef.current;
            remoteVideo.muted = false;
            remoteVideo.playsInline = true;
            remoteVideo.autoplay = true;
            remoteVideo.play().catch(console.warn);
            
            // Multiple aggressive play attempts
            for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                if (remoteVideo.paused) {
                  remoteVideo.play().catch(console.warn);
                  console.log(`🔄 Mobile remote video play attempt ${i + 1}`);
                }
              }, i * 300);
            }
          }, 100);
        }
      }
    }, 2000); // Every 2 seconds
    
    // Initial aggressive refresh sequence
    const initialRefresh = (attempt = 1) => {
      const localVideo = localVideoRef.current;
      const remoteVideo = remoteVideoRef.current;
      
      console.log(`🔄 Mobile initial refresh attempt ${attempt}`);
      
      // Force setup both videos
      if (localVideo && localStreamRef.current) {
        localVideo.srcObject = localStreamRef.current;
        localVideo.play().catch(console.warn);
      }
      
      if (remoteVideo && remoteStreamRef.current) {
        remoteVideo.srcObject = remoteStreamRef.current;
        remoteVideo.muted = false;
        remoteVideo.playsInline = true;
        remoteVideo.autoplay = true;
        remoteVideo.play().catch(console.warn);
        
        // Aggressive play attempts
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            if (remoteVideo.paused) {
              remoteVideo.play().catch(console.warn);
            }
          }, i * 200);
        }
      }
      
      // Retry up to 10 times
      if (attempt < 10) {
        setTimeout(() => initialRefresh(attempt + 1), 1000);
      }
    };
    
    // Start initial refresh sequence
    setTimeout(() => initialRefresh(1), 500);
    setTimeout(() => initialRefresh(2), 2000);
    setTimeout(() => initialRefresh(3), 5000);
    
    return () => {
      clearInterval(mobileRefreshInterval);
    };
  }, [status]);

  // Comprehensive media test function
  const testAllMedia = useCallback(async () => {
    console.log('=== COMPREHENSIVE MEDIA TEST ===');
    
    try {
      // Test 1: Check if getUserMedia is available
      console.log('Test 1: Checking getUserMedia support...');
      if (!navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices is not available');
      }
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not available');
      }
      console.log('✅ getUserMedia is supported');
      
      // Test 2: Check available devices
      console.log('Test 2: Checking available devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      console.log('Audio devices:', audioDevices);
      console.log('Video devices:', videoDevices);
      
      if (audioDevices.length === 0) {
        console.warn('⚠️ No audio input devices found');
      }
      if (videoDevices.length === 0) {
        console.warn('⚠️ No video input devices found');
      }
      
      // Test 3: Test audio only
      console.log('Test 3: Testing audio only...');
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('✅ Audio test successful:', {
          audioTracks: audioStream.getAudioTracks().length,
          trackLabels: audioStream.getAudioTracks().map(t => t.label)
        });
        audioStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('❌ Audio test failed:', error);
      }
      
      // Test 4: Test video only
      console.log('Test 4: Testing video only...');
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        console.log('✅ Video test successful:', {
          videoTracks: videoStream.getVideoTracks().length,
          trackLabels: videoStream.getVideoTracks().map(t => t.label)
        });
        videoStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('❌ Video test failed:', error);
      }
      
      // Test 5: Test both together
      console.log('Test 5: Testing audio + video together...');
      try {
        const fullStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        console.log('✅ Full media test successful:', {
          audioTracks: fullStream.getAudioTracks().length,
          videoTracks: fullStream.getVideoTracks().length,
          streamId: fullStream.id,
          active: fullStream.active
        });
        fullStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('❌ Full media test failed:', error);
      }
      
      console.log('=== MEDIA TEST COMPLETE ===');
      alert('Media test complete! Check the browser console for detailed results.');
      
    } catch (error) {
      console.error('❌ Media test failed:', error);
      alert('Media test failed: ' + (error as Error).message);
    }
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining the call...</p>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting...</p>
          <p className="text-gray-400 text-sm mt-2">Setting up camera and microphone</p>
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🔄 Manual video refresh triggered');
                if (localStreamRef.current && localVideoRef.current) {
                  localVideoRef.current.srcObject = localStreamRef.current;
                  localVideoRef.current.play().catch(console.warn);
                }
                // Force transition to connected
                setStatus("connected");
                callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
                startAudioLevelMonitoring();
              }}
              className="text-white border-white hover:bg-white hover:text-gray-900"
            >
              🔄 Refresh Video
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Preparing call...</p>
          <p className="text-gray-400 text-sm mt-2">Getting ready for {role === "caller" ? "outgoing" : "incoming"} call</p>
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🚀 Manual call start triggered');
                if (localStreamRef.current && localVideoRef.current) {
                  localVideoRef.current.srcObject = localStreamRef.current;
                  localVideoRef.current.play().catch(console.warn);
                }
                // Force transition to connected for immediate video
                setStatus("connected");
                callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
                startAudioLevelMonitoring();
              }}
              className="text-white border-white hover:bg-white hover:text-gray-900"
            >
              🚀 Start Video Call
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
  return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Call Failed</h2>
          <p className="text-gray-300 mb-6">
            {mediaError || "Unable to establish connection. Please try again."}
          </p>
          
          {/* Helpful message for device issues */}
          {mediaError?.includes("microphone") && mode === "video" && !mediaError?.includes("Permission denied") && (
            <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <p className="text-blue-200 text-sm">
                💡 <strong>Tip:</strong> You can still make video calls without a microphone. 
                The other person will be able to see you and hear you through their speakers, 
                but you won't be able to speak back.
              </p>
            </div>
          )}
          
          {/* Helpful message for no devices */}
          {mediaError?.includes("No camera or microphone found") && mode === "video" && (
            <div className="mb-4 p-3 bg-green-900/30 rounded-lg border border-green-500/30">
              <p className="text-green-200 text-sm">
                ✅ <strong>Good news:</strong> You can still make video calls without any devices! 
                The system will create a placeholder video stream so the call can continue.
                The other person will see a "No Camera" placeholder instead of your video.
              </p>
            </div>
          )}
          
          {/* Helpful message for headset detection issues */}
          {availableDevices.filter(d => d.kind === 'audioinput').length === 0 && (
            <div className="mb-4 p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
              <p className="text-yellow-200 text-sm">
                🎧 <strong>Headset Not Detected:</strong> Your headset might not be detected by the browser. Try:
              </p>
              <ul className="text-yellow-200 text-xs mt-2 ml-4 list-disc">
                <li>Unplug and reconnect your headset</li>
                <li>Check if your headset is set as the default audio device</li>
                <li>Try the "Refresh Devices" button below</li>
                <li>Check Windows/Mac sound settings</li>
                <li>Try a different USB port or audio jack</li>
              </ul>
            </div>
          )}
          
          {/* Helpful message for audio calls without microphone */}
          {mediaError?.includes("No microphone found") && mode === "audio" && (
            <div className="mb-4 p-3 bg-green-900/30 rounded-lg border border-green-500/30">
              <p className="text-green-200 text-sm">
                ✅ <strong>Good news:</strong> You can still make audio calls without a microphone! 
                The system will create a silent audio stream so the call can continue.
                You'll be able to hear the other person, but they won't hear you speak.
              </p>
            </div>
          )}
          
          {/* Helpful message for permission denied */}
          {mediaError?.includes("Permission denied") && (
            <div className="mb-4 p-4 bg-red-900/30 rounded-lg border border-red-500/30">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔒</div>
                <div className="flex-1">
                  <p className="text-red-200 text-sm font-semibold mb-2">
                    Permission Required: Camera and Microphone Access Denied
                  </p>
                  <p className="text-red-200 text-sm mb-3">
                    Your browser blocked camera and microphone access. To fix this:
                  </p>
                  <div className="bg-red-800/50 rounded p-3 mb-3">
                    <p className="text-red-100 text-sm font-medium mb-2">Quick Fix:</p>
                    <ol className="text-red-200 text-xs space-y-1 ml-4 list-decimal">
                      <li>Look for the camera/microphone icon in your browser's address bar (right side) 
                          <span className="text-yellow-300"> 📷🎤 or 🚫</span>
                      </li>
                      <li>Click the icon and select "Allow" for both camera and microphone</li>
                      <li>Refresh this page (F5 or Ctrl+R)</li>
                      <li>Try the call again</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => window.location.reload()} 
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🔄 Refresh Page
                    </Button>
                    <Button 
                      onClick={requestPermissions} 
                      size="sm"
                      variant="outline"
                      className="border-red-400 text-red-200 hover:bg-red-800"
                    >
                      🎥 Request Permissions
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Device status */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg text-left">
            <h3 className="text-white font-semibold mb-2">Device Status:</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${availableDevices.some(d => d.kind === 'audioinput') ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Audio: {availableDevices.filter(d => d.kind === 'audioinput').length} device(s)
                {availableDevices.filter(d => d.kind === 'audioinput').length === 0 && (
                  <span className="text-yellow-400 text-xs">(Try refreshing devices below)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${availableDevices.some(d => d.kind === 'videoinput') ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Video: {availableDevices.filter(d => d.kind === 'videoinput').length} device(s)
                {availableDevices.filter(d => d.kind === 'videoinput').length === 0 && mode === "video" && (
                  <span className="text-yellow-400 text-xs">(Will use placeholder)</span>
                )}
              </div>
            </div>
            
            {/* Device details */}
            {availableDevices.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h4 className="text-white text-xs font-medium mb-2">Detected Devices:</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  {availableDevices.map((device, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      {device.label || `Unknown ${device.kind}`} ({device.kind})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {mediaError?.includes("Permission denied") ? (
              <Button onClick={requestPermissions} className="w-full">
                Request Permissions
              </Button>
            ) : (
              <Button onClick={retryMediaAccess} className="w-full">
                Try Again
              </Button>
            )}
            
            {/* Test audio button */}
            <Button 
              variant="outline" 
              onClick={testAudio}
              className="w-full"
            >
              🎤 Test Audio
            </Button>
            
            {/* Test video button */}
            <Button 
              variant="outline" 
              onClick={testVideo}
              className="w-full"
            >
              📹 Test Video
            </Button>
            
            {/* Refresh video streams button */}
            <Button 
              variant="outline" 
              onClick={refreshVideoStreams}
              className="w-full"
            >
              🔄 Refresh Video
            </Button>
            
            {/* Debug video elements button */}
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🔍 Debug video elements:');
                console.log('Local video element:', localVideoRef.current ? {
                  srcObject: !!localVideoRef.current.srcObject,
                  videoWidth: localVideoRef.current.videoWidth,
                  videoHeight: localVideoRef.current.videoHeight,
                  readyState: localVideoRef.current.readyState,
                  paused: localVideoRef.current.paused,
                  muted: localVideoRef.current.muted
                } : 'null');
                console.log('Remote video element:', remoteVideoRef.current ? {
                  srcObject: !!remoteVideoRef.current.srcObject,
                  videoWidth: remoteVideoRef.current.videoWidth,
                  videoHeight: remoteVideoRef.current.videoHeight,
                  readyState: remoteVideoRef.current.readyState,
                  paused: remoteVideoRef.current.paused,
                  muted: remoteVideoRef.current.muted
                } : 'null');
                console.log('Local stream:', localStreamRef.current ? {
                  audioTracks: localStreamRef.current.getAudioTracks().length,
                  videoTracks: localStreamRef.current.getVideoTracks().length,
                  active: localStreamRef.current.active
                } : 'null');
                console.log('Remote stream:', remoteStreamRef.current ? {
                  audioTracks: remoteStreamRef.current.getAudioTracks().length,
                  videoTracks: remoteStreamRef.current.getVideoTracks().length,
                  active: remoteStreamRef.current.active
                } : 'null');
                alert('Video debug info logged to console');
              }}
              className="w-full"
            >
              🔍 Debug Video
            </Button>
            
            {/* Mobile-specific force video button */}
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🚀 MOBILE FORCE VIDEO REFRESH');
                
                // Force local video
                if (localVideoRef.current && localStreamRef.current) {
                  const localEl = localVideoRef.current;
                  localEl.srcObject = null;
                  localEl.load();
                  setTimeout(() => {
                    localEl.srcObject = localStreamRef.current;
                    localEl.play().catch(console.warn);
                    console.log('✅ Mobile local video forced');
                  }, 100);
                }
                
                // Force remote video - ULTRA-AGGRESSIVE
                if (remoteVideoRef.current && remoteStreamRef.current) {
                  const remoteEl = remoteVideoRef.current;
                  remoteEl.srcObject = null;
                  remoteEl.load();
                  setTimeout(() => {
                    remoteEl.srcObject = remoteStreamRef.current;
                    remoteEl.muted = false;
                    remoteEl.playsInline = true;
                    remoteEl.autoplay = true;
                    remoteEl.play().catch(console.warn);
                    console.log('✅ Mobile remote video forced');
                    
                    // Multiple aggressive play attempts
                    for (let i = 0; i < 20; i++) {
                      setTimeout(() => {
                        if (remoteEl.paused) {
                          remoteEl.play().catch(console.warn);
                        }
                      }, i * 100);
                    }
                  }, 100);
                }
                
                alert('Mobile video force refresh triggered!');
              }}
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              🚀 MOBILE FORCE VIDEO
            </Button>
            
            {/* Comprehensive test button */}
            <Button 
              variant="outline" 
              onClick={testAllMedia}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              🔍 Full Media Test
            </Button>
            
            {/* Refresh devices button - always show */}
            <Button 
              variant="outline" 
              onClick={refreshDevices}
              className="w-full"
            >
              🔄 Refresh Devices
            </Button>
            
            {mode === "video" && (
              <Button 
                variant="outline" 
                onClick={() => {
                  // Switch to audio mode
                  const audioUrl = window.location.href.replace('mode=video', 'mode=audio');
                  window.location.href = audioUrl;
                }} 
                className="w-full"
              >
                Switch to Audio Call
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
                router.push(messagesUrl);
              }} 
              className="w-full"
            >
              Back to Messages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show mode selector if needed
  if (showModeSelector) {
    return (
      <CallModeSelector
        onSelectMode={handleModeSelection}
        onCancel={() => {
          const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
          router.push(messagesUrl);
        }}
        peerName={peerInfo?.name || peerName}
        hasAudio={hasAudio}
        hasVideo={hasVideo}
        isCheckingDevices={isCheckingDevices}
      />
    );
  }

  // Show audio-only interface for audio calls
  if (mode === "audio") {
    return (
      <AudioCallInterface
        peerName={peerInfo?.name || peerName}
        peerAvatar={peerInfo?.avatar}
        status={status}
        callDuration={callDuration}
        muted={muted}
        isMuted={muted}
        onToggleMute={toggleMute}
        onEndCall={() => endCall(false)}
        onToggleSpeaker={toggleSpeaker}
        isSpeakerOn={isSpeakerOn}
        audioLevel={audioLevel}
        hasAudio={hasAudio}
        isFallbackStream={isFallbackStream}
        formatDuration={formatDuration}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
                router.push(messagesUrl);
              }}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {mode === "video" ? "Video Call" : "Voice Call"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>{peerInfo?.name || peerName}</span>
                {status === "connected" && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(callDuration)}</span>
                  </>
                )}
                {status === "ringing" && role === "caller" && (
                  <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">
                    Ringing...
                  </Badge>
                )}
                {(status as CallUIStatus) === "connecting" && (
                  <Badge variant="secondary" className="bg-blue-500 text-blue-900">
                    Connecting...
                  </Badge>
                )}
              </div>
              
              {/* Device status indicators */}
              {status === "connected" && (
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  {isFallbackStream && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <VideoOff className="h-3 w-3" />
                      No devices - using fallback
                    </span>
                  )}
                  {!isFallbackStream && hasAudio === false && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <MicOff className="h-3 w-3" />
                      No mic
                    </span>
                  )}
                  {!isFallbackStream && hasVideo === false && mode === "video" && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <VideoOff className="h-3 w-3" />
                      No camera
                    </span>
                  )}
                  {hasAudio && !muted && (
                    <span className="flex items-center gap-1 text-green-400">
                      <Mic className="h-3 w-3" />
                      Audio active
                    </span>
                  )}
                  {hasAudio && muted && (
                    <span className="flex items-center gap-1 text-red-400">
                      <MicOff className="h-3 w-3" />
                      Muted
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Test audio button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={testAudio}
              className="text-white hover:bg-white/10"
              title="Test Audio"
            >
              🎤 Test
            </Button>
            
            {/* Test video button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={testVideo}
              className="text-white hover:bg-white/10"
              title="Test Video"
            >
              📹 Test
            </Button>
            
            {/* Simple test button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  console.log('🔍 Testing basic getUserMedia support...');
                  
                  // Check if getUserMedia is available
                  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('getUserMedia is not supported in this browser');
                  }
                  
                  console.log('✅ getUserMedia is supported');
                  
                  // Test with very basic constraints
                  console.log('🎯 Requesting media with basic constraints...');
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 },
                    audio: true 
                  });
                  
                  console.log('✅ Media stream acquired:', {
                    audioTracks: stream.getAudioTracks().length,
                    videoTracks: stream.getVideoTracks().length,
                    streamId: stream.id,
                    active: stream.active
                  });
                  
                  // Log track details
                  stream.getAudioTracks().forEach((track, i) => {
                    console.log(`Audio track ${i}:`, {
                      label: track.label,
                      enabled: track.enabled,
                      readyState: track.readyState
                    });
                  });
                  
                  stream.getVideoTracks().forEach((track, i) => {
                    console.log(`Video track ${i}:`, {
                      label: track.label,
                      enabled: track.enabled,
                      readyState: track.readyState
                    });
                  });
                  
                  // Test video element assignment
                  if (localVideoRef.current) {
                    console.log('🎥 Assigning stream to video element...');
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.muted = true;
                    
                    // Wait a bit for video to load
                    setTimeout(async () => {
                    try {
                        await localVideoRef.current!.play();
                        console.log('✅ Video started playing');
                    } catch (playError) {
                      console.error('❌ Video play failed:', playError);
                    }
                    }, 100);
                    
                    alert('✅ SUCCESS! Media access works. Check console for details and video should appear.');
                  } else {
                    console.error('❌ Video element not found');
                    alert('❌ Video element not found');
                  }
                  
                  // Clean up after 5 seconds
                  setTimeout(() => {
                    console.log('🔄 Cleaning up test stream...');
                    stream.getTracks().forEach(track => track.stop());
                  }, 5000);
                  
                } catch (error: any) {
                  console.error('❌ Basic test failed:', error);
                  console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    constraint: error.constraint
                  });
                  
                  let errorMsg = 'Unknown error';
                  if (error.name === 'NotAllowedError') {
                    errorMsg = 'Permission denied. Please allow camera and microphone access.';
                  } else if (error.name === 'NotFoundError') {
                    errorMsg = 'No camera or microphone found.';
                  } else if (error.name === 'NotReadableError') {
                    errorMsg = 'Camera or microphone is being used by another app.';
                  } else {
                    errorMsg = error.message || 'Unknown error';
                  }
                  
                  alert('❌ Test failed: ' + errorMsg);
                }
              }}
              className="text-white hover:bg-white/10"
              title="Basic Test"
            >
              🔍 Basic Test
            </Button>
            
            {/* HTML test button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  console.log('🧪 Testing with direct HTML video element...');
                  
                  // Create a new video element directly
                  const testVideo = document.createElement('video');
                  testVideo.style.width = '320px';
                  testVideo.style.height = '240px';
                  testVideo.style.backgroundColor = '#000';
                  testVideo.muted = true;
                  testVideo.autoplay = true;
                  testVideo.playsInline = true;
                  
                  // Add to page temporarily
                  testVideo.style.position = 'fixed';
                  testVideo.style.top = '10px';
                  testVideo.style.right = '10px';
                  testVideo.style.zIndex = '9999';
                  testVideo.style.border = '2px solid red';
                  document.body.appendChild(testVideo);
                  
                  // Get media stream
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 },
                    audio: true 
                  });
                  
                  console.log('✅ Stream acquired for HTML test:', {
                    audioTracks: stream.getAudioTracks().length,
                    videoTracks: stream.getVideoTracks().length
                  });
                  
                  // Assign to video element
                  testVideo.srcObject = stream;
                  
                  // Try to play
                  try {
                  await testVideo.play();
                    console.log('✅ HTML video element playing');
                    alert('✅ HTML test successful! You should see a red-bordered video in the top-right corner.');
                  } catch (playError) {
                    console.error('❌ HTML video play failed:', playError);
                    alert('❌ HTML video play failed: ' + playError);
                  }
                  
                  // Clean up after 5 seconds
                  setTimeout(() => {
                    console.log('🔄 Cleaning up HTML test...');
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(testVideo);
                  }, 5000);
                  
                } catch (error: any) {
                  console.error('❌ HTML test failed:', error);
                  alert('❌ HTML test failed: ' + error.message);
                }
              }}
              className="text-white hover:bg-white/10"
              title="HTML Test"
            >
              🧪 HTML Test
            </Button>
            
            {/* Debug info button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('🔍 DEBUG INFO:');
                console.log('Browser info:', {
                  userAgent: navigator.userAgent,
                  mediaDevices: !!navigator.mediaDevices,
                  getUserMedia: !!navigator.mediaDevices?.getUserMedia,
                  webRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
                  https: location.protocol === 'https:'
                });
                console.log('Local stream:', localStreamRef.current ? {
                  audioTracks: localStreamRef.current.getAudioTracks().length,
                  videoTracks: localStreamRef.current.getVideoTracks().length,
                  active: localStreamRef.current.active
                } : 'null');
                console.log('Remote stream:', remoteStreamRef.current ? {
                  audioTracks: remoteStreamRef.current.getAudioTracks().length,
                  videoTracks: remoteStreamRef.current.getVideoTracks().length,
                  active: remoteStreamRef.current.active
                } : 'null');
                console.log('Local video element:', localVideoRef.current ? {
                  srcObject: !!localVideoRef.current.srcObject,
                  videoWidth: localVideoRef.current.videoWidth,
                  videoHeight: localVideoRef.current.videoHeight,
                  readyState: localVideoRef.current.readyState,
                  paused: localVideoRef.current.paused
                } : 'null');
                console.log('Remote video element:', remoteVideoRef.current ? {
                  srcObject: !!remoteVideoRef.current.srcObject,
                  videoWidth: remoteVideoRef.current.videoWidth,
                  videoHeight: remoteVideoRef.current.videoHeight,
                  readyState: remoteVideoRef.current.readyState,
                  paused: remoteVideoRef.current.paused
                } : 'null');
                alert('Debug info logged to console. Check browser console (F12) for details.');
              }}
              className="text-white hover:bg-white/10"
              title="Debug Info"
            >
              🔍 Debug
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/10"
            >
              {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
          </Button>
          </div>
        </div>
      </div>

      {/* Accessibility Status Indicator */}
      {status === "connected" && (
        <DeviceStatusIndicator
          hasMicrophone={hasAudio === true}
          hasCamera={hasVideo === true}
          mode={mode}
          isFallbackMode={isFallbackStream}
          onSwitchToChat={() => {
            const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
            router.push(messagesUrl);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        {isMinimized ? (
          // Minimized view
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <Avatar className="mx-auto h-20 w-20 mb-4">
                <AvatarImage src={peerInfo?.avatar} />
                <AvatarFallback className="text-2xl">
                  {peerInfo?.name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold mb-2">{peerInfo?.name || peerName}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {status === "connected" ? formatDuration(callDuration) : "Call in progress"}
              </p>
              <Button
                variant="destructive"
                onClick={() => endCall(false)}
                className="w-full"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        ) : (
          // Full view
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Remote video */}
              <VideoTile
                videoRef={remoteVideoRef}
                label="Remote"
                isConnected={status === "connected"}
                avatarUrl={peerInfo?.avatar}
                name={peerInfo?.name || peerName}
              />
              
              {/* Local video */}
              <VideoTile
                videoRef={localVideoRef}
                label="You"
                mirrored
                isLocal
                isConnected={status === "connected"}
                avatarUrl={me?.name ? undefined : undefined}
                name={me?.name || "You"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!isMinimized && (
          <CallControls
            status={status}
            muted={muted}
            camOff={camOff}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onEndCall={() => endCall(false)}
            onShareScreen={shareScreen}
            isSharingScreen={isSharingScreen}
            mode={mode}
            hasAudio={hasAudio}
            hasVideo={hasVideo}
            isFallbackStream={isFallbackStream}
            audioLevel={audioLevel}
          />
      )}

      {/* Accessibility Help */}
      <AccessibilityHelp />
    </div>
  );
}
