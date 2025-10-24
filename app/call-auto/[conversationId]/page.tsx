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
  Settings,
  ArrowLeft,
} from "lucide-react";

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
    
    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('error', handleError);
    
    // Check if video already has a source
    if (video.srcObject) {
      console.log(`Video ${label} already has srcObject, triggering load`);
      video.load();
    }
    
    // Periodic check for video stream detection
    const checkVideoStream = () => {
      if (video.srcObject && video.readyState >= 2) {
        setShowVideo(true);
        setHasVideoStream(true);
      }
    };
    
    const checkInterval = setInterval(checkVideoStream, 1000);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('error', handleError);
      clearInterval(checkInterval);
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
      />
      
      {/* Overlay for debugging */}
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

export default function AutoCallRoomPage() {
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
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [peerInfo, setPeerInfo] = useState<{ name?: string; avatar?: string }>({});

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Use the auto-connecting WebRTC hook
  const {
    state,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    toggleMute,
    toggleCamera,
    endCall,
  } = useAutoWebRTCCall({
    open: authChecked && !!me?.id && !!conversationId,
    conversationId,
    role: role || "caller",
    mode: mode || "video",
    meId: me?.id || "",
    peerUserId: peerUserId || "",
    onStatus: (status) => {
      console.log("Call status changed:", status);
      if (status === "connected") {
        callTracker.updateCallStatus(conversationId, "connected").catch(console.warn);
      } else if (status === "ended") {
        callTracker.updateCallStatus(conversationId, "ended").catch(console.warn);
      }
    },
    autoConnect: true, // Enable automatic connection
  });

  // Setup video refs
  useEffect(() => {
    setLocalVideoRef(localVideoRef.current);
    setRemoteVideoRef(remoteVideoRef.current);
    setRemoteAudioRef(remoteAudioRef.current);
  }, [setLocalVideoRef, setRemoteVideoRef, setRemoteAudioRef]);

  // Show mode selector if no mode specified
  useEffect(() => {
    if (authChecked && me?.id && !mode) {
      setShowModeSelector(true);
    }
  }, [authChecked, me?.id, mode]);

  // Handle mode selection
  const handleModeSelection = useCallback((selectedMode: "audio" | "video") => {
    setShowModeSelector(false);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mode', selectedMode);
    window.history.replaceState({}, '', newUrl.toString());
  }, []);

  // Handle call end
  const handleEndCall = useCallback(() => {
    endCall();
    setTimeout(() => {
      router.push(`/messages/${conversationId}`);
    }, 1000);
  }, [endCall, router, conversationId]);

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
  if (state.mediaError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-4">{state.mediaError}</p>
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
            {state.status}
          </Badge>
          {state.isConnected && (
            <Badge variant="default" className="text-xs bg-green-600">
              Connected
            </Badge>
          )}
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
            {!state.isConnected && (
              <div className="mb-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">
                  {state.status === "ringing" ? "Ringing..." : 
                   state.status === "connecting" ? "Connecting..." : 
                   "Establishing connection..."}
                </h2>
                <p className="text-gray-400">
                  {state.status === "ringing" ? "Waiting for the other person to answer" :
                   state.status === "connecting" ? "Setting up video call..." :
                   "Please wait while we connect you..."}
                </p>
                {state.connectionAttempts > 0 && (
                  <p className="text-yellow-400 text-sm mt-2">
                    Attempting reconnection ({state.connectionAttempts}/3)...
                  </p>
                )}
              </div>
            )}

            {/* Video Grid - Show when connected */}
            {state.isConnected && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Local Video */}
                <VideoTile
                  videoRef={localVideoRef}
                  label="You"
                  mirrored={true}
                  isLocal={true}
                  isConnected={state.isConnected}
                  name={me.name || me.email}
                />

                {/* Remote Video */}
                <VideoTile
                  videoRef={remoteVideoRef}
                  label={peerInfo?.name || peerName || "Remote"}
                  isConnected={state.isConnected}
                  name={peerInfo?.name || peerName}
                  avatarUrl={peerInfo?.avatar}
                />
              </div>
            )}

            {/* Controls - Show when connected */}
            {state.isConnected && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={toggleMute}
                  variant={state.muted ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  {state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                  onClick={toggleCamera}
                  variant={state.camOff ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  {state.camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>

                <Button
                  onClick={handleEndCall}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-12 h-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Basic controls when not connected */}
            {!state.isConnected && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleEndCall}
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
                variant={state.muted ? "destructive" : "secondary"}
                size="lg"
                className="rounded-full w-12 h-12"
              >
                {state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                onClick={handleEndCall}
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
            <div className="text-sm space-y-1">
              <div>Status: {state.status}</div>
              <div>Connected: {state.isConnected ? "Yes" : "No"}</div>
              <div>Muted: {state.muted ? "Yes" : "No"}</div>
              <div>Camera Off: {state.camOff ? "Yes" : "No"}</div>
              <div>Dial Time: {state.dialSeconds}s</div>
              {state.connectionAttempts > 0 && (
                <div>Reconnection Attempts: {state.connectionAttempts}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

