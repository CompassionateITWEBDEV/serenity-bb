"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Bluetooth,
  Plus,
  X,
  Square,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";

interface MobileCallUIProps {
  peerName: string;
  peerAvatar?: string;
  mode: "audio" | "video";
  status: string;
  callDuration: number;
  muted: boolean;
  camOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onBack: () => void;
  formatDuration: (seconds: number) => string;
}

export function MobileCallUI({
  peerName,
  peerAvatar,
  mode,
  status,
  callDuration,
  muted,
  camOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onBack,
  formatDuration,
}: MobileCallUIProps) {
  const [audioRoute, setAudioRoute] = useState<"speaker" | "bluetooth" | "earpiece">("speaker");

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black text-white relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-white/70 hover:bg-white/10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content - Centered Call Info */}
      <div className="flex flex-col items-center justify-center min-h-screen pb-60">
        {/* Avatar/Photo */}
        <div className="mb-8">
          <Avatar className="h-32 w-32 ring-4 ring-white/20">
            <AvatarImage src={peerAvatar} />
            <AvatarFallback className="text-4xl bg-zinc-700">
              {peerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <h2 className="text-3xl font-semibold mb-4">{peerName}</h2>

        {/* Call Type and Duration */}
        <div className="text-white/70 text-lg mb-8">
          {mode === "video" ? "Video" : "Voice"} Call
          {status === "connected" && ` • ${formatDuration(callDuration)}`}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 w-full px-8">
          {/* Top Row Controls */}
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Mute Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant={muted ? "secondary" : "outline"}
                className={`h-16 w-16 rounded-full border-2 ${
                  muted ? "bg-red-500 border-red-500 text-white" : "border-white/20 hover:bg-white/10"
                }`}
                onClick={onToggleMute}
              >
                {muted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
              </Button>
              <span className="text-xs text-white/80">mute</span>
            </div>

            {/* Keypad Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant="outline"
                className="h-16 w-16 rounded-full border-2 border-white/20 hover:bg-white/10"
              >
                <Square className="h-7 w-7" />
              </Button>
              <span className="text-xs text-white/80">Keypad</span>
            </div>

            {/* Audio Route Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant={audioRoute === "bluetooth" ? "default" : "outline"}
                className={`h-16 w-16 rounded-full border-2 ${
                  audioRoute === "bluetooth"
                    ? "bg-white text-zinc-900 border-white"
                    : "border-white/20 hover:bg-white/10"
                }`}
                onClick={() => {
                  const routes: Array<"speaker" | "bluetooth" | "earpiece"> = [
                    "speaker",
                    "bluetooth",
                    "earpiece",
                  ];
                  const currentIndex = routes.indexOf(audioRoute);
                  setAudioRoute(routes[(currentIndex + 1) % routes.length]);
                }}
              >
                {audioRoute === "bluetooth" ? (
                  <Bluetooth className="h-7 w-7" />
                ) : (
                  <Volume2 className="h-7 w-7" />
                )}
              </Button>
              <span className="text-xs text-white/80">audio</span>
            </div>
          </div>

          {/* Bottom Row Controls */}
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Add Call Button (if video mode) */}
            {mode === "video" && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-16 rounded-full border-2 border-white/20 hover:bg-white/10"
                >
                  <Plus className="h-7 w-7" />
                </Button>
                <span className="text-xs text-white/80">add call</span>
              </div>
            )}

            {/* Video Toggle (if audio call) */}
            {mode === "audio" && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-16 rounded-full border-2 border-white/20 hover:bg-white/10"
                  onClick={() => {
                    const newUrl = window.location.href.replace("mode=audio", "mode=video");
                    window.location.href = newUrl;
                  }}
                >
                  <Video className="h-7 w-7" />
                </Button>
                <span className="text-xs text-white/80">video</span>
              </div>
            )}

            {/* Messenger Button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant="outline"
                className="h-16 w-16 rounded-full border-2 border-white/20 hover:bg-white/10"
              >
                <MessageSquare className="h-7 w-7" />
              </Button>
              <span className="text-xs text-white/80">Messenger</span>
            </div>
          </div>

          {/* End Call Button */}
          <Button
            size="lg"
            variant="destructive"
            className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 border-4 border-white/20 shadow-lg mt-4"
            onClick={onEndCall}
          >
            <X className="h-10 w-10" />
          </Button>
        </div>
      </div>
    </div>
  );
}

