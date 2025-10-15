"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function IncomingCallBanner({
  callerName,
  mode,
  onAccept,
  onDecline,
  callerAvatar,
}: {
  callerName: string;
  mode: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
  callerAvatar?: string;
}) {
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRinging(prev => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className={`relative ${isRinging ? 'animate-pulse' : ''}`}>
              <Avatar className="h-12 w-12 ring-4 ring-white/30">
                <AvatarImage src={callerAvatar} />
                <AvatarFallback className="text-lg font-semibold">
                  {callerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isRinging && (
                <div className="absolute -inset-2 rounded-full border-2 border-white/50 animate-ping"></div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{callerName}</h3>
              <p className="text-blue-100 text-sm">
                Incoming {mode === "video" ? "video" : "voice"} call
              </p>
            </div>
            <div className="text-right">
              {mode === "video" ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-14 rounded-full"
              onClick={onDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              {mode === "video" ? (
                <Video className="h-7 w-7" />
              ) : (
                <Phone className="h-7 w-7" />
              )}
            </Button>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            Tap to {mode === "video" ? "start video call" : "answer call"}
          </p>
        </div>
      </div>
    </div>
  );
}
