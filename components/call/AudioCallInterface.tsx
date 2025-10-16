"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Users,
  Clock,
  Signal
} from "lucide-react";

interface AudioCallInterfaceProps {
  peerName: string;
  peerAvatar?: string;
  status: string;
  callDuration: number;
  muted: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onToggleSpeaker: () => void;
  isSpeakerOn: boolean;
  audioLevel: number;
  hasAudio: boolean | null;
  isFallbackStream: boolean;
  formatDuration: (seconds: number) => string;
}

export default function AudioCallInterface({
  peerName,
  peerAvatar,
  status,
  callDuration,
  muted,
  isMuted,
  onToggleMute,
  onEndCall,
  onToggleSpeaker,
  isSpeakerOn,
  audioLevel,
  hasAudio,
  isFallbackStream,
  formatDuration
}: AudioCallInterfaceProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-blue-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Voice Call
              </h1>
              <div className="flex items-center gap-2 text-sm text-blue-200">
                <span>{peerName}</span>
                {status === "connected" && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(callDuration)}
                    </span>
                  </>
                )}
                {status === "ringing" && (
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
              
              {/* Audio status indicators */}
              {status === "connected" && (
                <div className="flex items-center gap-2 text-xs text-blue-300 mt-1">
                  {isFallbackStream && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Signal className="h-3 w-3" />
                      Audio only mode
                    </span>
                  )}
                  {!isFallbackStream && hasAudio === false && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <MicOff className="h-3 w-3" />
                      No microphone
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
        </div>
      </div>

      {/* Main Audio Call Interface */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          {/* Large Avatar */}
          <div className="relative mb-8">
            <div className="relative">
              <Avatar className="mx-auto h-32 w-32 ring-4 ring-blue-500/30">
                <AvatarImage src={peerAvatar} />
                <AvatarFallback className="text-4xl bg-blue-600">
                  {peerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Audio level indicator ring */}
              {!muted && hasAudio && audioLevel && audioLevel > 0 && (
                <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse"
                     style={{ 
                       transform: `scale(${1 + (audioLevel / 100) * 0.2})`,
                       opacity: Math.min(audioLevel / 50, 1)
                     }}
                />
              )}
              
              {/* Connection status indicator */}
              {status === "connected" && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl font-semibold mb-2">{peerName}</h2>
          
          {/* Call Status */}
          <div className="mb-8">
            {status === "connected" && (
              <p className="text-blue-200 flex items-center justify-center gap-2">
                <Signal className="h-4 w-4" />
                Connected • {formatDuration(callDuration)}
              </p>
            )}
            {status === "ringing" && (
              <p className="text-yellow-400 flex items-center justify-center gap-2">
                <Phone className="h-4 w-4 animate-pulse" />
                Ringing...
              </p>
            )}
            {status === "connecting" && (
              <p className="text-blue-400 flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                Connecting...
              </p>
            )}
          </div>

          {/* Audio Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {/* Mute/Unmute */}
            <Button
              size="lg"
              variant={muted ? "destructive" : "secondary"}
              className="h-16 w-16 rounded-full"
              onClick={onToggleMute}
              disabled={hasAudio === false || isFallbackStream}
              title={isFallbackStream ? "No devices available" : hasAudio === false ? "No microphone available" : muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            {/* Speaker Toggle */}
            <Button
              size="lg"
              variant={isSpeakerOn ? "default" : "secondary"}
              className="h-16 w-16 rounded-full"
              onClick={onToggleSpeaker}
              title={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
            >
              {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </Button>

            {/* End Call */}
            <Button
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full"
              onClick={onEndCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>

          {/* Audio Level Visualization */}
          {!muted && hasAudio && audioLevel && audioLevel > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-1 rounded-full transition-all duration-150 ${
                      audioLevel > (i + 1) * 10 
                        ? 'bg-green-400' 
                        : 'bg-gray-600'
                    }`}
                    style={{
                      height: `${Math.max(4, (audioLevel / 10) * 2)}px`
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-blue-300 mt-2">Audio Level</p>
            </div>
          )}

          {/* Call Info */}
          <div className="text-sm text-blue-300 space-y-1">
            {isFallbackStream && (
              <p className="flex items-center justify-center gap-1">
                <Signal className="h-3 w-3" />
                Audio-only mode (no camera required)
              </p>
            )}
            {hasAudio === false && (
              <p className="text-orange-400 flex items-center justify-center gap-1">
                <MicOff className="h-3 w-3" />
                No microphone detected - you can still listen
              </p>
            )}
            <p className="text-blue-400">
              Tap the microphone to mute/unmute
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
