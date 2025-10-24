"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFixedWebRTCCall } from "@/hooks/useFixedWebRTCCall";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor,
  Volume2,
  VolumeX
} from "lucide-react";

export default function FixedCallPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const { patient } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<"audio" | "video">("video");
  const [role, setRole] = useState<"caller" | "callee">("caller");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const {
    state: { status, muted, camOff, mediaError, dialSeconds },
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    setMuted,
    setCamOff,
    hangup,
    toggleMute,
    toggleCamera,
    shareScreen,
  } = useFixedWebRTCCall({
    open: isOpen,
    conversationId: conversationId as string,
    role,
    mode,
    meId: patient?.id || "",
    peerUserId: "peer", // This should be the actual peer user ID
    onStatus: (newStatus) => {
      console.log('Call status changed:', newStatus);
      if (newStatus === "ended" || newStatus === "failed") {
        router.push("/dashboard");
      }
    },
  });

  // Set video refs
  useEffect(() => {
    setLocalVideoRef(localVideoRef.current);
    setRemoteVideoRef(remoteVideoRef.current);
    setRemoteAudioRef(remoteAudioRef.current);
  }, [setLocalVideoRef, setRemoteVideoRef, setRemoteAudioRef]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-green-500";
      case "connecting": return "text-yellow-500";
      case "ringing": return "text-blue-500";
      case "failed": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "idle": return "Ready to call";
      case "ringing": return "Ringing...";
      case "connecting": return "Connecting...";
      case "connected": return "Connected";
      case "failed": return "Call failed";
      case "ended": return "Call ended";
      case "missed": return "Missed call";
      default: return status;
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please log in to make calls.</p>
          <Button onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-white hover:bg-gray-700"
          >
            ← Back to Dashboard
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {mode === "video" ? "Video" : "Audio"} Call
            </h1>
            <p className="text-sm text-gray-400">
              Conversation: {conversationId}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`text-sm font-medium ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </div>
          {dialSeconds > 0 && (
            <div className="text-sm text-gray-400">
              {formatTime(dialSeconds)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {mediaError ? (
          <Card className="p-8 text-center max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Media Error</h2>
            <p className="text-gray-600 mb-4">{mediaError}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        ) : (
          <div className="w-full max-w-4xl">
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  You {muted && "(Muted)"} {camOff && "(Camera Off)"}
                </div>
              </div>

              {/* Remote Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  Remote
                </div>
              </div>
            </div>

            {/* Remote Audio */}
            <audio ref={remoteAudioRef} autoPlay />

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={toggleMute}
                variant={muted ? "destructive" : "secondary"}
                size="lg"
                className="rounded-full w-16 h-16"
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {mode === "video" && (
                <Button
                  onClick={toggleCamera}
                  variant={camOff ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-16 h-16"
                >
                  {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              )}

              {mode === "video" && (
                <Button
                  onClick={shareScreen}
                  variant="secondary"
                  size="lg"
                  className="rounded-full w-16 h-16"
                >
                  <Monitor className="h-6 w-6" />
                </Button>
              )}

              <Button
                onClick={hangup}
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mt-4">
              <div className="bg-gray-800 rounded-lg p-1">
                <Button
                  onClick={() => setMode("audio")}
                  variant={mode === "audio" ? "default" : "ghost"}
                  size="sm"
                  className="text-white"
                >
                  Audio Only
                </Button>
                <Button
                  onClick={() => setMode("video")}
                  variant={mode === "video" ? "default" : "ghost"}
                  size="sm"
                  className="text-white"
                >
                  Video Call
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-800 p-4 text-xs text-gray-400">
          <div>Status: {status}</div>
          <div>Mode: {mode}</div>
          <div>Role: {role}</div>
          <div>Muted: {muted ? "Yes" : "No"}</div>
          <div>Camera Off: {camOff ? "Yes" : "No"}</div>
        </div>
      )}
    </div>
  );
}
