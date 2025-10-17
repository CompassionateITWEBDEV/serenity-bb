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
    
    // Build the new URL with all parameters
    const params = new URLSearchParams();
    params.set("role", "callee");
    params.set("peer", incomingCall.callerId);
    params.set("peerName", incomingCall.callerName);
    params.set("autoAccept", "true");

    // Redirect to the appropriate call type
    const callUrl = incomingCall.mode === "video" 
      ? `/call/video/${incomingCall.conversationId}?${params.toString()}`
      : `/call/audio/${incomingCall.conversationId}?${params.toString()}`;
    
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
      try {
        console.log('🎧 Setting up incoming call listener...');
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) {
          console.log('❌ No user or component unmounted');
          return;
        }

        console.log('👤 Current user:', user.id);

        // Check if user is staff
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("user_id")
          .eq("user_id", user.id)
          .single();

        if (staffError) {
          console.error('❌ Staff check failed:', staffError);
          return;
        }

        if (!staffData || !mounted) {
          console.log('❌ User is not staff or component unmounted');
          return;
        }

        console.log('✅ User confirmed as staff');

        // Listen for incoming calls via real-time
        const channel = supabase.channel(`staff-calls-${user.id}`, {
          config: { broadcast: { ack: true } }
        });

        console.log('📡 Subscribing to channel:', `staff-calls-${user.id}`);

        channel
          .on("broadcast", { event: "incoming-call" }, (payload) => {
            if (!mounted) return;
            
            const callData = payload.payload as IncomingCall;
            console.log("📞 Incoming call received:", callData);
            
            setIncomingCall(callData);
            setIsRinging(true);
            
            // Auto-decline after 30 seconds if not answered
            setTimeout(() => {
              if (mounted && isRinging) {
                console.log('⏰ Auto-declining call after timeout');
                declineCall();
              }
            }, 30000);
          })
          .on("broadcast", { event: "call-cancelled" }, (payload) => {
            if (!mounted) return;
            
            const { conversationId } = payload.payload as { conversationId: string };
            if (incomingCall?.conversationId === conversationId) {
              console.log('📞 Call cancelled:', conversationId);
              setIncomingCall(null);
              setIsRinging(false);
            }
          })
          .subscribe((status) => {
            console.log('📡 Channel subscription status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to incoming call channel');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ Channel subscription failed:', status);
            }
          });

        return () => {
          mounted = false;
          console.log('🧹 Cleaning up incoming call listener');
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('❌ Failed to setup incoming call listener:', error);
      }
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
