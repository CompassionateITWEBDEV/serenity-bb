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
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => setShowVideo(true);
      const handleError = () => setShowVideo(false);
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
      };
    }
  }, [videoRef]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-900 shadow-2xl">
      {showVideo && isConnected ? (
      <video
        ref={videoRef}
        autoPlay
        playsInline
          muted={isLocal}
          className={`h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
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
}) {
  return (
    <div className="flex items-center justify-center gap-4 p-6">
      <div className="flex items-center gap-3">
        {/* Mute/Unmute */}
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const threadChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check device permissions on mount
  useEffect(() => {
    if (authChecked && me?.id) {
      getAvailableDevices();
      
      // Proactively request permissions for better UX
      const requestInitialPermissions = async () => {
        try {
          // Just check if we can access media without actually using it
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: mode === "video" 
          });
          // Immediately stop the stream
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          // Permission denied or other error - this is expected and handled by the main flow
          console.log("Initial permission check failed (this is normal):", error);
        }
      };
      
      // Small delay to let the UI render first
      setTimeout(requestInitialPermissions, 500);
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
      if (s === "connected") {
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
      }
      if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus("ended");
        callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
      }
    };
    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id]);

  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
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
      
      // First, try to get available devices
      const devices = await getAvailableDevices();
      
      // Check what devices are available
      const audioAvailable = devices.some(device => device.kind === 'audioinput');
      const videoAvailable = devices.some(device => device.kind === 'videoinput');
      
      // Update state for UI
      setHasAudio(audioAvailable);
      setHasVideo(videoAvailable);
      
      console.log("Available devices:", { hasAudio: audioAvailable, hasVideo: videoAvailable, mode });
      
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
        // For audio calls, audio is required, video is optional
        if (audioAvailable) {
          constraints.audio = { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          };
        } else {
          throw new Error("No microphone found. Audio calls require a microphone. Please connect a microphone or switch to video call.");
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
      
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: any) {
        console.warn("Primary media request failed, trying fallback:", error);
        
        // Fallback to more permissive constraints
        const fallbackConstraints: MediaStreamConstraints = {};
        
        if (mode === "video") {
          if (videoAvailable) {
            fallbackConstraints.video = {
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 15, max: 30 }
            };
          }
          if (audioAvailable) {
            fallbackConstraints.audio = true;
          }
        } else {
          if (audioAvailable) {
            fallbackConstraints.audio = true;
          }
        }
        
        try {
          return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (fallbackError: any) {
          console.warn("Fallback media request failed, trying minimal constraints:", fallbackError);
          
          // Last resort: minimal constraints
          const minimalConstraints: MediaStreamConstraints = {};
          
          if (mode === "video" && videoAvailable) {
            minimalConstraints.video = true;
          }
          if (audioAvailable) {
            minimalConstraints.audio = true;
          }
          
          try {
            return await navigator.mediaDevices.getUserMedia(minimalConstraints);
          } catch (finalError: any) {
            console.warn("All media requests failed, creating fallback stream:", finalError);
            
            // Ultimate fallback: create a canvas stream for video calls
            if (mode === "video") {
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
                ctx.fillText('No Camera Available', 160, 120);
              }
              
              const stream = canvas.captureStream(30);
              setIsFallbackStream(true);
              return stream;
            } else {
              // For audio calls, we can't create a fallback
              throw finalError;
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Media access error:", error);
      
      let errorMessage = "Unable to access camera or microphone.";
      
      if (error.name === "NotAllowedError" || error.message?.includes("Permission denied")) {
        errorMessage = "Camera and microphone access denied. Please click 'Allow' when prompted by your browser and try again.";
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
    if (!threadChanRef.current) return;
    void threadChanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      if (msg.kind === "webrtc-offer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try {
          const pc = ensurePC();
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          /* ignore */
        }
      } else if (msg.kind === "bye") {
        endCall(true);
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
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    await new Promise<void>((res, rej) => {
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
    });
    await ch.send({
      type: "broadcast",
      event: "invite",
      payload: { conversationId, fromId: me.id, fromName: me.email || "Caller", mode },
    });
    try {
      supabase.removeChannel(ch);
    } catch {}
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
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    // 2) Add tracks to PC
    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    // 3) If caller, create offer + send + ring
    if (role === "caller") {
        setStatus("ringing");
        callTracker.updateCallStatus(conversationId!, "ringing").catch(console.warn);
        
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
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

  // ---------- Controls ----------
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s || !hasAudio) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  }, [hasAudio]);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s || !hasVideo) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOff((v) => !v);
  }, [hasVideo]);

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
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [endCall]);

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
      
      // Now try the actual call
      await startOrPrep();
    } catch (error) {
      console.error("Permission request failed:", error);
      setStatus("failed");
      setMediaError("Permission denied. Please allow camera and microphone access and try again.");
    }
  }, [mode, startOrPrep]);

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
          
          {/* Helpful message for permission denied */}
          {mediaError?.includes("Permission denied") && (
            <div className="mb-4 p-3 bg-red-900/30 rounded-lg border border-red-500/30">
              <p className="text-red-200 text-sm">
                🔒 <strong>Permission Required:</strong> Your browser blocked camera and microphone access. 
                To fix this:
              </p>
              <ul className="text-red-200 text-xs mt-2 ml-4 list-disc">
                <li>Look for the camera/microphone icon in your browser's address bar</li>
                <li>Click it and select "Allow" for camera and microphone</li>
                <li>Refresh the page and try again</li>
                <li>Or check your browser settings for site permissions</li>
              </ul>
            </div>
          )}
          
          {/* Device status */}
          {availableDevices.length > 0 && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg text-left">
              <h3 className="text-white font-semibold mb-2">Available Devices:</h3>
              <div className="space-y-1 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Audio: {availableDevices.filter(d => d.kind === 'audioinput').length} device(s)
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${availableDevices.some(d => d.kind === 'videoinput') ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Video: {availableDevices.filter(d => d.kind === 'videoinput').length} device(s)
                </div>
              </div>
            </div>
          )}
          
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
          />
      )}
    </div>
  );
}
