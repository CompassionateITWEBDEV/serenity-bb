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
  Volume2,
  VolumeX,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";

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
      {showVideo && hasVideoStream ? (
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
      />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
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
        </div>
      )}
      
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
  const [peerMuted, setPeerMuted] = useState(false); // Track peer's mute status

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
        // Keep next so user returns straight to the call if they log in
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
    video.muted = isLocal; // Local muted, remote unmuted
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    
    // Ensure remote audio is unmuted and full volume
    if (!isLocal) {
      video.muted = false;
      video.volume = 1.0;
      console.log(`🔊 Remote video unmuted and volume set to 1.0`);
    }

    // Force play
    video.play().then(() => {
      console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing`);
      
      // Log audio status for remote
      if (!isLocal && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const audioTracks = stream.getAudioTracks();
        console.log(`🔊 Remote audio tracks:`, {
          count: audioTracks.length,
          enabled: audioTracks.map(t => ({ label: t.label, enabled: t.enabled }))
        });
      }
    }).catch(err => {
      console.warn(`⚠️ Failed to auto-play ${isLocal ? 'local' : 'remote'} video:`, err);
    });

    return true;
  }, []);

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
      console.log('🚀 Initializing call component...');
      
      // Initialize video elements
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
      
      // Auto-start call immediately for better UX
      console.log('🚀 Auto-starting call...');
      console.log('📞 Call will start automatically - no permission request needed');
      setTimeout(() => {
        startOrPrep();
      }, 500);
    }
  }, [authChecked, me?.id, mode]);

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
      console.log(`🔄 Connection state changed: ${s}`);
      
      if (s === "connecting") {
        setStatus("connecting");
        console.log('⏳ Setting status to connecting');
      } else if (s === "connected") {
        setStatus("connected");
        console.log('✅ Setting status to connected');
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        // Start audio level monitoring when connected
        startAudioLevelMonitoring();
      } else if (s === "failed" || s === "disconnected" || s === "closed") {
        console.log('❌ Connection failed/disconnected/closed');
        setStatus("ended");
        callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
        // Stop audio level monitoring when disconnected
        stopAudioLevelMonitoring();
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('✅ ICE connection established');
        if (status === 'connecting') {
          setStatus('connected');
        }
      }
    };
    pc.ontrack = (ev) => {
      console.log(`📡 Received remote ${ev.track.kind} track:`, ev.track.label);
      
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        console.log('🆕 Created new remote stream');
      }
      
      remoteStreamRef.current.addTrack(ev.track);
      console.log(`✅ Added ${ev.track.kind} track to remote stream. Total tracks:`, {
        audio: remoteStreamRef.current.getAudioTracks().length,
        video: remoteStreamRef.current.getVideoTracks().length
      });
      
      // Ensure audio tracks are enabled and properly configured
      if (ev.track.kind === 'audio') {
        ev.track.enabled = true;
        console.log(`🔊 Remote audio track enabled:`, ev.track.label);
        
        // Force remote audio to play with audio context if available
        try {
          if (typeof window !== 'undefined' && !audioContextRef.current) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
          }
          
          // Ensure the audio track is output through speakers/headphones
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1.0;
            console.log('🔊 Forced remote video element: unmuted, volume=1.0');
          }
        } catch (audioError) {
          console.warn('Failed to ensure remote audio output:', audioError);
        }
      }
      
      // Set the video element source for remote stream using setup function
      setupVideoElement(remoteVideoRef as React.RefObject<HTMLVideoElement>, remoteStreamRef.current, false);
    };

    pcRef.current = pc;
    return pc;
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

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
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
    }
  }, []);

  // Enhanced media stream acquisition with flexible device handling
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setMediaError(null);
      
      console.log('=== GETTING MEDIA STREAM (SIMPLIFIED) ===');
      console.log('Mode:', mode);
      
      // Audio-only calls - no camera
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: false  // Camera disabled for all calls
      };
      
      console.log('🎯 Requesting media access for call...');
      console.log('📞 This will request camera/microphone access automatically');
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Media stream acquired successfully:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamId: stream.id,
        active: stream.active
      });
      
      // Update device availability state
      setHasAudio(stream.getAudioTracks().length > 0);
      setHasVideo(stream.getVideoTracks().length > 0);
      
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
      console.error("❌ Media access error:", error);
      
      let errorMessage = "Unable to access camera or microphone.";
      
      if (error.name === "NotAllowedError" || error.message?.includes("Permission denied")) {
        errorMessage = "Camera and microphone access is required for video calls. Please click 'Allow' when your browser asks for permission, then the call will start automatically.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera or microphone found. Please connect your devices and try again.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone is being used by another application. Please close other apps and try again.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera or microphone doesn't support the required settings.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMediaError(errorMessage);
      setStatus("failed");
      throw error;
    }
  }, [mode]);

  // ---------- Signaling on thread_${conversationId} ----------
  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!threadChanRef.current) return;
    void threadChanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);
  
  // Send mute status to peer
  const sendMuteStatus = useCallback((mutedState: boolean) => {
    if (!threadChanRef.current) return;
    void threadChanRef.current.send({ 
      type: "broadcast", 
      event: "mute-status", 
      payload: { muted: mutedState, from: me?.id } 
    });
  }, [me?.id]);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "mute-status" }, (e) => {
      const payload = e.payload as { muted: boolean; from: string };
      if (!payload || payload.from === me.id) return;
      
      console.log(`🔇 Peer mute status changed: ${payload.muted ? 'MUTED' : 'UNMUTED'}`);
      setPeerMuted(payload.muted);
    });

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      if (msg.kind === "webrtc-offer") {
        console.log('📥 Received offer as callee, setting up answer...');
        setStatus("connecting");
        
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        console.log('✅ Set remote description');
        
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false  // Audio-only - match the offer
        });
        console.log('✅ Created answer with audio:', answer.sdp?.includes('m=audio'));
        console.log('Answer SDP m-lines:', answer.sdp?.match(/m=\w+/g));
        
        try {
          await pc.setLocalDescription(answer);
          console.log('✅ Set local description');
          sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
          console.log('✅ Sent answer to peer');
        } catch (error) {
          console.error('❌ Error setting local description:', error);
          console.error('Answer SDP:', answer.sdp);
          console.error('Remote SDP:', msg.sdp);
        }
      } else if (msg.kind === "webrtc-answer") {
        console.log('📥 Received answer as caller');
        setStatus("connecting");
        
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        console.log('✅ Set remote description for answer');
      } else if (msg.kind === "webrtc-ice") {
        try {
          const pc = ensurePC();
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          console.log('🧊 Added ICE candidate');
        } catch (err) {
          console.warn('Failed to add ICE candidate:', err);
        }
      } else if (msg.kind === "bye") {
        console.log('👋 Received bye, ending call');
        setStatus("ended");
        callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
      }
    });

    ch.subscribe();
    threadChanRef.current = ch;

    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
      threadChanRef.current = null;
    };
  }, [conversationId, ensurePC, me?.id, sendSignal, threadChannel]);

  // ---------- Ring peer (for IncomingCallBanner) on user_${peer} ----------
  async function ringPeer() {
    if (!peerUserId || !conversationId || !me?.id) return;
    
    console.log(`📞 Attempting to ring peer: ${peerUserId}`);
    
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    
    try {
      // Subscribe to channel with timeout
      const subscribed = await new Promise<boolean>((res) => {
        const to = setTimeout(() => {
          console.warn('⚠️ Ring channel subscription timeout after 8s, proceeding anyway');
          res(false);
        }, 8000); // Increased timeout to 8s
        
        ch.subscribe((status) => {
          console.log(`📡 Ring channel status: ${status}`);
          if (status === "SUBSCRIBED") {
            clearTimeout(to);
            console.log('✅ Ring channel subscribed successfully');
            res(true);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(to);
            console.warn(`⚠️ Ring channel subscription failed: ${status}`);
            res(false);
          }
        });
      });
      
      // Send invite to user channel (only if subscribed successfully)
      if (subscribed) {
        console.log('📤 Sending invite to user channel');
        await ch.send({
          type: "broadcast",
          event: "invite",
          payload: { conversationId, fromId: me.id, fromName: me.email || "Caller", mode },
        });
        console.log('✅ Invite sent successfully');
      } else {
        console.warn('⚠️ Cannot send invite - channel not subscribed');
      }
      
      // Also send to staff-calls channel if the peer is staff
      console.log('📞 Attempting to send to staff-calls channel');
      const staffChannel = supabase.channel(`staff-calls-${peerUserId}`, { config: { broadcast: { ack: true } } });
      try {
        const staffSubscribed = await new Promise<boolean>((res) => {
          const to = setTimeout(() => res(false), 8000);
          staffChannel.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              console.log('✅ Staff channel subscribed');
              res(true);
            } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              res(false);
            }
          });
        });
        
        if (staffSubscribed) {
          console.log('📤 Sending to staff-calls channel');
          await staffChannel.send({
            type: "broadcast",
            event: "incoming-call",
            payload: { 
              conversationId, 
              callerId: me.id, 
              callerName: me.email || "Caller", 
              mode 
            },
          });
          console.log('✅ Staff call notification sent');
        }
      } catch (error) {
        console.warn("Failed to send to staff-calls channel:", error);
      } finally {
        try {
          supabase.removeChannel(staffChannel);
        } catch {}
      }
    } catch (error) {
      console.warn("Failed to ring peer:", error);
      // Don't throw - call can still proceed
    } finally {
      try {
        supabase.removeChannel(ch);
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

    // 2) Add ONLY audio tracks to PC (filter out any video tracks)
    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => {
      // Only add audio tracks for audio-only calls
      if (t.kind === 'audio') {
        console.log(`Adding ${t.kind} track to peer connection:`, t.label);
        pc.addTrack(t, localStreamRef.current!);
      } else {
        console.log(`Skipping ${t.kind} track (audio-only mode)`, t.label);
      }
    });

    // 3) If caller, create offer + send + ring
    if (role === "caller") {
        setStatus("ringing");
        callTracker.updateCallStatus(conversationId!, "ringing").catch(console.warn);
        
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,  // Audio-only - no video
      });
      console.log('Created offer with audio:', offer.sdp?.includes('m=audio'));
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      await ringPeer(); // show IncomingCallBanner on the peer
    }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
      // Don't throw - let the UI handle the error state
    }
  }, [ensurePC, getMediaStream, me?.id, mode, role, sendSignal, conversationId, peerUserId, peerInfo?.name, peerName]);

  useEffect(() => {
    if (!authChecked || !me?.id) return;
    (async () => {
      await startOrPrep();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, me?.id]);

  // Initialize mute status on connection
  useEffect(() => {
    if (status === "connected" && !muted) {
      // Send initial unmuted status to peer
      sendMuteStatus(false);
      console.log('📤 Sent initial unmuted status to peer');
    }
  }, [status, muted, sendMuteStatus]);

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
    
    // Broadcast mute status to peer
    sendMuteStatus(newMutedState);
  }, [muted, sendMuteStatus]);

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
            {/* Audio Test Button - Output Test */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  // Create audio context and generate a test tone
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  // Play a pleasant tone for 500ms
                  oscillator.frequency.value = 440; // A4 note
                  oscillator.type = 'sine';
                  
                  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.5);
                  
                  console.log('✅ Audio test tone played');
                } catch (error) {
                  console.error('❌ Audio test failed:', error);
                  alert('Audio test failed. Please check your browser audio settings.');
                }
              }}
              className="text-white hover:bg-white/10"
              title="Test Audio Output"
            >
              🔊 Test
            </Button>
            
            {/* Test audio button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={testAudio}
              className="text-white hover:bg-white/10"
              title="Test Microphone Input"
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
                console.log('🔍 SIMPLE TEST STARTING...');
                console.log('Browser support check:');
                console.log('- navigator.mediaDevices:', !!navigator.mediaDevices);
                console.log('- getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
                console.log('- HTTPS:', location.protocol === 'https:');
                console.log('- Localhost:', location.hostname === 'localhost' || location.hostname === '127.0.0.1');
                
                try {
                  // Test 1: Check if we can enumerate devices
                  console.log('📱 Testing device enumeration...');
                  const devices = await navigator.mediaDevices.enumerateDevices();
                  const audioDevices = devices.filter(d => d.kind === 'audioinput');
                  const videoDevices = devices.filter(d => d.kind === 'videoinput');
                  
                  console.log('Available devices:', {
                    audio: audioDevices.length,
                    video: videoDevices.length,
                    total: devices.length
                  });
                  
                  if (audioDevices.length === 0 && videoDevices.length === 0) {
                    alert('❌ No audio or video devices found! Please connect a camera and microphone.');
                    return;
                  }
                  
                  // Test 2: Try basic getUserMedia
                  console.log('🎤 Testing basic getUserMedia...');
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: videoDevices.length > 0,
                    audio: audioDevices.length > 0
                  });
                  
                  console.log('✅ getUserMedia successful!', {
                    audioTracks: stream.getAudioTracks().length,
                    videoTracks: stream.getVideoTracks().length,
                    streamId: stream.id,
                    active: stream.active
                  });
                  
                  // Test 3: Try to display in video element
                  if (localVideoRef.current) {
                    console.log('🎥 Testing video element assignment...');
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.muted = true;
                    
                    try {
                      await localVideoRef.current.play();
                      console.log('✅ Video element playing successfully!');
                      alert('✅ SUCCESS! You should see yourself in the video. Check the video preview!');
                    } catch (playError) {
                      console.error('❌ Video play failed:', playError);
                      alert('❌ Video element failed to play: ' + playError);
                    }
                  } else {
                    console.error('❌ localVideoRef.current is null!');
                    alert('❌ Video element not found!');
                  }
                  
                  // Clean up after 5 seconds
                  setTimeout(() => {
                    console.log('🔄 Cleaning up test stream...');
                    stream.getTracks().forEach(track => {
                      track.stop();
                      console.log(`Stopped ${track.kind} track:`, track.label);
                    });
                  }, 5000);
                  
                } catch (error: any) {
                  console.error('❌ SIMPLE TEST FAILED:', error);
                  console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    constraint: error.constraint
                  });
                  
                  let errorMsg = 'Unknown error';
                  if (error.name === 'NotAllowedError') {
                    errorMsg = 'Permission denied! Click the camera/mic icon in your browser address bar and allow access.';
                  } else if (error.name === 'NotFoundError') {
                    errorMsg = 'No camera or microphone found! Please connect your devices.';
                  } else if (error.name === 'NotReadableError') {
                    errorMsg = 'Camera or microphone is being used by another app! Close other apps and try again.';
                  } else {
                    errorMsg = error.message || 'Unknown error occurred';
                  }
                  
                  alert('❌ SIMPLE TEST FAILED: ' + errorMsg);
                }
              }}
              className="text-white hover:bg-white/10"
              title="Simple Test"
            >
              🔍 Simple Test
            </Button>
            
            {/* HTML test button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  console.log('🧪 HTML TEST STARTING...');
                  
                  // Create a new video element directly
                  const testVideo = document.createElement('video');
                  testVideo.style.width = '300px';
                  testVideo.style.height = '200px';
                  testVideo.style.border = '2px solid red';
                  testVideo.style.position = 'fixed';
                  testVideo.style.top = '50px';
                  testVideo.style.right = '50px';
                  testVideo.style.zIndex = '9999';
                  testVideo.muted = true;
                  testVideo.autoplay = true;
                  testVideo.playsInline = true;
                  
                  // Add to page
                  document.body.appendChild(testVideo);
                  
                  // Get media stream
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                  });
                  
                  console.log('✅ HTML test stream acquired:', {
                    audioTracks: stream.getAudioTracks().length,
                    videoTracks: stream.getVideoTracks().length
                  });
                  
                  // Assign to test video
                  testVideo.srcObject = stream;
                  
                  // Play
                  await testVideo.play();
                  console.log('✅ HTML test video playing');
                  
                  alert('✅ HTML TEST SUCCESS! You should see a red-bordered video in the top-right corner. Check if you can see yourself!');
                  
                  // Clean up after 5 seconds
                  setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(testVideo);
                    console.log('🔄 HTML test cleaned up');
                  }, 5000);
                  
                } catch (error: any) {
                  console.error('❌ HTML TEST FAILED:', error);
                  alert('❌ HTML TEST FAILED: ' + (error.message || 'Unknown error'));
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
            <div className="flex gap-4 w-full">
              {/* Remote Participant Pane */}
              <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden relative min-h-[500px]">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-9xl font-bold text-gray-600 mb-4">
                      {(peerInfo?.name || peerName).charAt(0).toUpperCase()}
                    </div>
                    <div className="text-2xl font-semibold text-white mb-2">
                      {peerInfo?.name || peerName}
                    </div>
                    {status === "connected" ? (
                      <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Connected</span>
                      </div>
                    ) : status === "ringing" ? (
                      <div className="text-blue-400 text-sm animate-pulse">Ringing...</div>
                    ) : (
                      <div className="text-yellow-400 text-sm">Connecting...</div>
                    )}
                    {status === "connected" && peerMuted && (
                      <div className="flex items-center justify-center gap-2 text-red-400 text-sm mt-2">
                        <MicOff className="h-4 w-4" />
                        <span>Other person is muted</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-gray-800 w-32 h-24 rounded-lg overflow-hidden">
                  <VideoTile
                    videoRef={remoteVideoRef}
                    label="Remote"
                    isConnected={status === "connected"}
                    avatarUrl={peerInfo?.avatar}
                    name={peerInfo?.name || peerName}
                  />
                </div>
              </div>

              {/* Local Participant Pane */}
              <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden relative min-h-[500px]">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-9xl font-bold text-gray-600 mb-4">
                      {(me?.name || "You").charAt(0).toUpperCase()}
                    </div>
                    <div className="text-2xl font-semibold text-white mb-2">
                      {me?.name || "You"}
                    </div>
                    {!muted ? (
                      <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                        <Mic className="h-4 w-4" />
                        <span>Microphone on</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                        <MicOff className="h-4 w-4" />
                        <span>You are muted</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-gray-800 w-32 h-24 rounded-lg overflow-hidden">
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
                <div className="absolute top-3 right-3 bg-black/60 p-2 rounded-full">
                  <VideoOff className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - Centered */}
      <div className="flex justify-center pb-6">
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
      </div>
    </div>
  );
}
