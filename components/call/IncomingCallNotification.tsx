"use client";

import { useEffect, useState } from "react";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import IncomingCallBanner from "./IncomingCallBanner";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IncomingCallNotification() {
  const { incomingCall, isRinging, acceptCall, declineCall } = useIncomingCall();
  const [isVisible, setIsVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Show notification when there's an incoming call
  useEffect(() => {
    if (incomingCall && isRinging) {
      setIsVisible(true);
      
      // Play notification sound if enabled
      if (soundEnabled) {
        playNotificationSound();
      }
    } else {
      setIsVisible(false);
    }
  }, [incomingCall, isRinging, soundEnabled]);

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  };

  if (!isVisible || !incomingCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <IncomingCallBanner
          callerName={incomingCall.callerName}
          mode={incomingCall.mode}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
        
        {/* Sound control */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/90 hover:bg-white"
          >
            {soundEnabled ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Sound On
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Sound Off
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
