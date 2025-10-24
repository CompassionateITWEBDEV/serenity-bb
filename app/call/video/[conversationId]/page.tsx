"use client";

import { ultraSafeSetLocalDescription, ultraSafeSetRemoteDescription, ultraSafeCreateOffer, ultraSafeCreateAnswer } from "@/lib/webrtc/robust-fix";

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
  Maximize2,
  Minimize2,
  ArrowLeft,
} from "lucide-react";
import DeviceStatusIndicator from "@/components/accessibility/DeviceStatusIndicator";
import AccessibilityHelp from "@/components/accessibility/AccessibilityHelp";

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
    
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('error', handleError);
    
    if (video.srcObject) {
      console.log(`Video ${label} already has srcObject, triggering load`);
      video.load();
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
              <p className="text-gray-400 text-xs mt-1">Connecting...</p>
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
  hasAudio?: boolean | null;
  hasVideo?: boolean | null;
  isFallbackStream?: boolean;
  audioLevel?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-4 p-6">
      <div className="flex items-center gap-3">
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

        <Button
          size="lg"
          variant={isSharingScreen ? "default" : "secondary"}
          className="h-14 w-14 rounded-full"
          onClick={onShareScreen}
        >
          {isSharingScreen ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </Button>

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

export default function VideoCallPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const role = (qs.get("role") as "caller" | "callee") || "caller";
  const peerUserId = qs.get("peer") || "";
  const peerName = decodeURIComponent(qs.get("peerName") || "Peer");

  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<{ id: string; email?: string | null; name?: string; role?: UserRole } | null>(null);
  const [peerInfo, setPeerInfo] = useState<{ name: string; avatar?: string } | null>(null);

  type CallUIStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "failed";
  const [status, setStatus] = useState<CallUIStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [isFallbackStream, setIsFallbackStream] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
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
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      const { data: session } = await supabase.auth.getSession();
      if (!alive) return;
      if (session.session?.user) {
        const user = session.session.user;
        const userRole = await determineUserRole(user.id);
        setMe({ 
          id: user.id, 
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: userRole
        });
        setAuthChecked(true);
        return;
      }
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const userRole = await determineUserRole(user.user.id);
        setMe({ 
          id: user.user.id, 
          email: user.user.email,
          name: user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'User',
          role: userRole
        });
        setAuthChecked(true);
        return;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.user) {
        const user = refreshed.session.user;
        const userRole = await determineUserRole(user.id);
        setMe({ 
          id: user.id, 
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: userRole
        });
        setAuthChecked(true);
      } else {
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
  const setupVideoElement = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, isLocal: boolean) => {
    if (!videoRef.current || !stream) {
      console.warn(`⚠️ Cannot setup video element: videoRef=${!!videoRef.current}, stream=${!!stream}`);
      return false;
    }

    const video = videoRef.current;
    console.log(`🎥 Setting up ${isLocal ? 'local' : 'remote'} video element:`, {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
      streamId: stream.id,
      videoElement: !!video
    });

    video.srcObject = stream;
    video.muted = isLocal;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;

    video.play().then(() => {
      console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing`);
    }).catch(err => {
      console.warn(`⚠️ Failed to auto-play ${isLocal ? 'local' : 'remote'} video:`, err);
    });

    return true;
  }, []);

  // Function to setup video element with retry
  const setupVideoElementWithRetry = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, isLocal: boolean, maxRetries = 5) => {
    let retries = 0;
    
    const trySetup = () => {
      if (videoRef.current && stream) {
        return setupVideoElement(videoRef, stream, isLocal);
      } else if (retries < maxRetries) {
        retries++;
        console.log(`🔄 Retrying video setup (${retries}/${maxRetries})...`);
        setTimeout(trySetup, 200); // Increased delay for video elements
        return false;
      } else {
        console.error(`❌ Failed to setup video element after ${maxRetries} retries`);
        return false;
      }
    };
    
    return trySetup();
  }, [setupVideoElement]);

  // Ensure video elements are updated when streams change
  useEffect(() => {
    if (localStreamRef.current) {
      setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
    }
  }, [localStreamRef.current, setupVideoElement]);

  useEffect(() => {
    if (remoteStreamRef.current) {
      setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
    }
  }, [remoteStreamRef.current, setupVideoElement]);

  // Initialize video elements and check permissions
  useEffect(() => {
    if (authChecked && me?.id) {
      console.log('🚀 Initializing video call component...');
      
      if (localVideoRef.current) {
        console.log('✅ Local video element found');
        localVideoRef.current.muted = true;
      } else {
        console.warn('⚠️ Local video element not found');
      }
      
      if (remoteVideoRef.current) {
        console.log('✅ Remote video element found');
        remoteVideoRef.current.muted = false;
      } else {
        console.warn('⚠️ Remote video element not found');
      }
      
      getAvailableDevices();
      
      const requestInitialPermissions = async () => {
        try {
          console.log('🔐 Requesting initial permissions...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: true 
          });
          console.log('✅ Initial permissions granted');
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.log("⚠️ Initial permission check failed (this is normal):", error);
        }
      };
      
      setTimeout(requestInitialPermissions, 500);
    }
  }, [authChecked, me?.id]);

  // Call duration timer
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
        callTimerRef.current = null;
      }
    };
  }, [status]);

  // ---------- WebRTC core ----------
  const ensurePC = useCallback(() => {
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
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          setConnectionTimeout(null);
        }
      } else if (s === "connecting") {
        setStatus("connecting");
      } else if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus("ended");
        callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
        stopAudioLevelMonitoring();
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          setConnectionTimeout(null);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`🧊 ICE connection state: ${iceState}`);
      
      if (iceState === "connected" || iceState === "completed") {
        console.log("✅ ICE connection established");
        if (status !== "connected") {
          setStatus("connected");
          callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
          startAudioLevelMonitoring();
        }
      } else if (iceState === "failed") {
        console.error("❌ ICE connection failed - trying to restart ICE");
        pc.restartIce();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`🧊 ICE gathering state: ${pc.iceGatheringState}`);
    };
    
    pc.ontrack = (ev) => {
      console.log(`📡 Received remote ${ev.track.kind} track:`, ev.track.label);
      
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        console.log('🆕 Created new remote stream');
      }
      
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
      
      setupVideoElementWithRetry(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id, conversationId, startAudioLevelMonitoring, stopAudioLevelMonitoring, status, setupVideoElementWithRetry]);

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
    setIsCheckingDevices(true);
    try {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        });
        testStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.log("Test stream failed (this is normal):", error);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("All detected devices:", devices);
      
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

  // Enhanced media stream acquisition for video calls
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setMediaError(null);
      
      console.log('=== GETTING VIDEO STREAM ===');
      
      const devices = await getAvailableDevices();
      const audioAvailable = devices.some(device => device.kind === 'audioinput');
      const videoAvailable = devices.some(device => device.kind === 'videoinput');
      
      setHasAudio(audioAvailable);
      setHasVideo(videoAvailable);
      
      console.log("Available devices:", { hasAudio: audioAvailable, hasVideo: videoAvailable });
      
      if (!audioAvailable && !videoAvailable) {
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
      
      let constraints: MediaStreamConstraints = {};
      
      if (videoAvailable) {
        constraints.video = { 
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        };
      } else {
        console.warn("No camera found, proceeding with audio-only video call");
        constraints.video = false;
      }
      
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
      
      try {
        console.log('🎯 Trying video constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Video stream acquired:', {
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          streamId: stream.id,
          active: stream.active
        });
        
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
        console.warn("❌ Video constraints failed, trying basic constraints:", error);
        
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          console.log('✅ Video stream acquired with basic constraints:', {
            audioTracks: basicStream.getAudioTracks().length,
            videoTracks: basicStream.getVideoTracks().length,
            streamId: basicStream.id,
            active: basicStream.active
          });
          
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
          console.warn("❌ Basic video constraints also failed:", basicError);
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Video access error:", error);
      
      let errorMessage = "Unable to access camera or microphone.";
      
      if (error.name === "NotAllowedError" || error.message?.includes("Permission denied")) {
        errorMessage = "Camera and microphone access denied. Please allow camera and microphone access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera or microphone found. Please connect your devices and try again.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone is being used by another application. Please close other apps and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMediaError(errorMessage);
      setStatus("failed");
      throw error;
    }
  }, [getAvailableDevices]);

  // ---------- Signaling ----------
  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!supabaseChannelRef.current) {
      console.warn("Cannot send signal: supabaseChannelRef.current is null");
      return;
    }
    try {
      supabaseChannelRef.current.send({ type: "broadcast", event: "signal", payload });
      console.log(`✅ Sent signal: ${payload.kind}`);
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    supabaseChannelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      if (msg.kind === "webrtc-offer") {
        console.log('📞 Received offer from peer, answering immediately...');
        setStatus("connecting");
        
        try {
          if (!localStreamRef.current) {
            console.log('🎥 Getting local video stream for callee...');
            localStreamRef.current = await getMediaStream();
            console.log('✅ Local video stream acquired for callee:', {
              audioTracks: localStreamRef.current.getAudioTracks().length,
              videoTracks: localStreamRef.current.getVideoTracks().length,
              streamId: localStreamRef.current.id
            });
            
            setupVideoElementWithRetry(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
            
            const pc = ensurePC();
            localStreamRef.current.getTracks().forEach((t) => {
              console.log(`Adding ${t.kind} track to peer connection:`, t.label);
              pc.addTrack(t, localStreamRef.current!);
            });
          }
          
          const pc = ensurePC();
          await ultraSafeSetRemoteDescription(pc, new RTCSessionDescription(msg.sdp));
          const answer = await ultraSafeCreateAnswer(pc, {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          console.log('Created answer with audio:', answer.sdp?.includes('m=audio'));
          console.log('Created answer with video:', answer.sdp?.includes('m=video'));
          await ultraSafeSetLocalDescription(pc, answer);
          sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
          console.log('✅ Answer sent to peer - connection should establish now');
          
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            setConnectionTimeout(null);
          }
        } catch (error) {
          console.error('❌ Failed to handle offer:', error);
          setStatus("failed");
          setMediaError("Failed to establish connection. Please try again.");
        }
      } else if (msg.kind === "webrtc-answer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try {
          const pc = ensurePC();
          console.log(`🧊 Adding ICE candidate:`, msg.candidate);
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          console.log(`✅ ICE candidate added successfully`);
        } catch (error) {
          console.warn(`⚠️ Failed to add ICE candidate:`, error);
        }
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });

    ch.subscribe();
    threadChanRef.current = ch;

    return () => {
      try {
        if (supabaseChannelRef.current) {
          supabase.removeChannel(supabaseChannelRef.current);
          supabaseChannelRef.current = null;
        }
      } catch {}
      threadChanRef.current = null;
    };
  }, [conversationId, ensurePC, me?.id, threadChannel, getMediaStream, setupVideoElementWithRetry, sendSignal, connectionTimeout]);

  // ---------- Ring peer ----------
  async function ringPeer() {
    if (!peerUserId || !conversationId || !me?.id) return;
    
    const callerName = me.name || me.email || "Caller";
    const callerAvatar = null;
    
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    const staffCh = supabase.channel(`staff-calls-${peerUserId}`, { config: { broadcast: { ack: true } } });
    
    try {
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

      await ch.send({
        type: "broadcast",
        event: "invite",
        payload: { conversationId, fromId: me.id, fromName: callerName, mode: "video" },
      });

      await staffCh.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          conversationId,
          callerId: me.id,
          callerName,
          callerAvatar,
          mode: "video",
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

    setStatus("connecting");
    setMediaError(null);

    callTracker.logCallEvent({
      conversationId: conversationId!,
      callerId: me.id,
      calleeId: peerUserId,
      callerName: me.name || me.email || "Caller",
      calleeName: peerInfo?.name || peerName,
      callType: "video",
      status: "initiated",
      startedAt: new Date().toISOString(),
    }).catch(console.warn);

    try {
      localStreamRef.current = await getMediaStream();
      console.log('Video stream acquired:', {
        audioTracks: localStreamRef.current.getAudioTracks().length,
        videoTracks: localStreamRef.current.getVideoTracks().length,
        streamId: localStreamRef.current.id
      });

      setupVideoElement(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);

      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((t) => {
        console.log(`Adding ${t.kind} track to peer connection:`, t.label);
        pc.addTrack(t, localStreamRef.current!);
      });

      if (role === "caller") {
        setStatus("ringing");
        callTracker.updateCallStatus(conversationId!, "ringing").catch(console.warn);
        
        const offer = await ultraSafeCreateOffer(pc, {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        console.log('Created offer with audio:', offer.sdp?.includes('m=audio'));
        console.log('Created offer with video:', offer.sdp?.includes('m=video'));
        await ultraSafeSetLocalDescription(pc, offer);
        sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
        await ringPeer();
        
        const timeout = setTimeout(() => {
          if (status !== "connected") {
            console.warn("⚠️ Connection timeout - no response from peer");
            setStatus("failed");
            setMediaError("Connection timeout. The other person may not be available or there may be a network issue.");
          }
        }, 30000);
        setConnectionTimeout(timeout);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
    }
  }, [ensurePC, getMediaStream, me?.id, role, sendSignal, conversationId, peerUserId, peerInfo?.name, peerName, status, setupVideoElement]);

  useEffect(() => {
    if (!authChecked || !me?.id) return;
    
    if (role === "caller") {
      (async () => {
        await startOrPrep();
      })();
    } else {
      console.log('📞 Callee ready, waiting for offer...');
      setStatus("idle");
      getAvailableDevices();
      
      const calleeTimeout = setTimeout(() => {
        if (status === "idle") {
          console.warn("⚠️ Callee timeout - no offer received");
          setStatus("failed");
          setMediaError("No incoming call received. The caller may have cancelled or there may be a connection issue.");
        }
      }, 60000);
      
      return () => clearTimeout(calleeTimeout);
    }
  }, [authChecked, me?.id, role, startOrPrep, getAvailableDevices, status]);

  // Auto-accept incoming calls for callees
  useEffect(() => {
    if (role === "callee" && status === "idle" && authChecked && me?.id) {
      const urlParams = new URLSearchParams(window.location.search);
      const autoAccept = urlParams.get('autoAccept');
      
      if (autoAccept === 'true') {
        console.log('📞 Auto-accepting incoming video call - preparing immediately...');
        
        (async () => {
          try {
            localStreamRef.current = await getMediaStream();
            console.log('✅ Local video stream acquired for auto-accept:', {
              audioTracks: localStreamRef.current.getAudioTracks().length,
              videoTracks: localStreamRef.current.getVideoTracks().length,
              streamId: localStreamRef.current.id
            });
            
            setupVideoElementWithRetry(localVideoRef as React.RefObject<HTMLVideoElement>, localStreamRef.current, true);
            
            const pc = ensurePC();
            localStreamRef.current.getTracks().forEach((t) => {
              console.log(`Adding ${t.kind} track to peer connection:`, t.label);
              pc.addTrack(t, localStreamRef.current!);
            });
            
            console.log('✅ Callee ready for immediate connection');
          } catch (error) {
            console.error('❌ Failed to prepare auto-accept call:', error);
            setStatus("failed");
            setMediaError("Failed to prepare call. Please try again.");
          }
        })();
      }
    }
  }, [role, status, authChecked, me?.id, getMediaStream, setupVideoElementWithRetry, ensurePC]);

  // Cleanup connection timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
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
  }, [camOff]);

  const shareScreen = useCallback(async () => {
    if (isSharingScreen) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsSharingScreen(false);
      
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
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        screenStreamRef.current = screenStream;
        setIsSharingScreen(true);
        
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
        
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsSharingScreen(false);
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
          }
          
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
      
      callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
      stopAudioLevelMonitoring();
      
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

      if (!remote && me?.id) {
        sendSignal({ kind: "bye", from: me.id });
        void byePeer();
      }

      const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
      router.push(messagesUrl);
    },
    [byePeer, me?.id, router, sendSignal, conversationId, stopAudioLevelMonitoring]
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
        </div>
      </div>
    );
  }

  if (status === "idle" && role === "callee") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Waiting for call...</p>
          <p className="text-gray-400 text-sm mt-2">Ready to receive incoming call from {peerInfo?.name || peerName}</p>
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
          
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
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
              <h1 className="text-xl font-semibold">Video Call</h1>
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
                {status === "connecting" && (
                  <Badge variant="secondary" className="bg-blue-500 text-blue-900">
                    Connecting...
                  </Badge>
                )}
              </div>
              
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
                  {!isFallbackStream && hasVideo === false && (
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
          mode="video"
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
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              <VideoTile
                videoRef={remoteVideoRef}
                label="Remote"
                isConnected={status === "connected"}
                avatarUrl={peerInfo?.avatar}
                name={peerInfo?.name || peerName}
              />
              
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
