"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";

interface EnhancedIncomingCallBannerProps {
  callerName: string;
  callerAvatar?: string;
  mode: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
  isRinging?: boolean;
}

export default function EnhancedIncomingCallBanner({
  callerName,
  callerAvatar,
  mode,
  onAccept,
  onDecline,
  isRinging = true,
}: EnhancedIncomingCallBannerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        {/* Caller Avatar */}
        <div className="mb-6">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback className="text-2xl">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Ringing Animation */}
          {isRinging && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping"></div>
              <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-ping animation-delay-200"></div>
              <div className="absolute inset-4 rounded-full border-4 border-blue-200 animate-ping animation-delay-400"></div>
            </div>
          )}
        </div>

        {/* Caller Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {callerName}
          </h2>
          <div className="flex items-center justify-center gap-2">
            {mode === "video" ? (
              <>
                <Video className="h-5 w-5 text-blue-600" />
                <Badge variant="default" className="bg-blue-600">
                  Video Call
                </Badge>
              </>
            ) : (
              <>
                <Phone className="h-5 w-5 text-green-600" />
                <Badge variant="default" className="bg-green-600">
                  Audio Call
                </Badge>
              </>
            )}
          </div>
          <p className="text-gray-600 mt-2">
            {isRinging ? "Incoming call..." : "Call in progress"}
          </p>
        </div>

        {/* Call Controls */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={onDecline}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          
          <Button
            onClick={onAccept}
            variant="default"
            size="lg"
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
          >
            {mode === "video" ? (
              <Video className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Call Status */}
        <div className="mt-6 text-sm text-gray-500">
          {isRinging ? (
            <p>Tap to answer or swipe to decline</p>
          ) : (
            <p>Call will connect automatically</p>
          )}
        </div>
      </div>
    </div>
  );
}

