"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface IncomingCall {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  mode: "audio" | "video";
  timestamp: string;
}

export function useIncomingCall() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const router = useRouter();

  // Accept the incoming call
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    
    const callUrl = `/call/${incomingCall.conversationId}?role=callee&mode=${incomingCall.mode}&peer=${encodeURIComponent(incomingCall.callerId)}&peerName=${encodeURIComponent(incomingCall.callerName)}`;
    router.push(callUrl);
    setIncomingCall(null);
    setIsRinging(false);
  }, [incomingCall, router]);

  // Decline the incoming call
  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      // Send decline signal to caller
      const channel = supabase.channel(`call-${incomingCall.conversationId}`);
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload: {
          kind: "call-declined",
          from: "staff",
          conversationId: incomingCall.conversationId,
        }
      });
    } catch (error) {
      console.error("Failed to send decline signal:", error);
    }
    
    setIncomingCall(null);
    setIsRinging(false);
  }, [incomingCall]);

  // Listen for incoming calls
  useEffect(() => {
    let mounted = true;

    const setupIncomingCallListener = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Check if user is staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (!staffData || !mounted) return;

      // Listen for incoming calls via real-time
      const channel = supabase.channel(`staff-calls-${user.id}`, {
        config: { broadcast: { ack: true } }
      });

      channel
        .on("broadcast", { event: "incoming-call" }, (payload) => {
          if (!mounted) return;
          
          const callData = payload.payload as IncomingCall;
          console.log("Incoming call received:", callData);
          
          setIncomingCall(callData);
          setIsRinging(true);
          
          // Auto-decline after 30 seconds if not answered
          setTimeout(() => {
            if (mounted && isRinging) {
              declineCall();
            }
          }, 30000);
        })
        .on("broadcast", { event: "call-cancelled" }, (payload) => {
          if (!mounted) return;
          
          const { conversationId } = payload.payload as { conversationId: string };
          if (incomingCall?.conversationId === conversationId) {
            setIncomingCall(null);
            setIsRinging(false);
          }
        })
        .subscribe();

      return () => {
        mounted = false;
        supabase.removeChannel(channel);
      };
    };

    setupIncomingCallListener();

    return () => {
      mounted = false;
    };
  }, [declineCall, isRinging]);

  return {
    incomingCall,
    isRinging,
    acceptCall,
    declineCall,
  };
}
