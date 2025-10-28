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
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      // Get Zoho Meeting link for this conversation
      const response = await fetch('/api/zoho-meeting', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: incomingCall.conversationId,
          patientName: incomingCall.callerName,
          staffName: 'Staff'
        })
      });

      const data = await response.json();
      
      if (data.meetingUrl) {
        console.log('Joining shared meeting:', data.meetingUrl);
        // Open Zoho Meeting in new tab - this will reuse the same meeting as the caller
        window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Failed to get meeting URL');
      }
    } catch (error) {
      console.error('Failed to join Zoho Meeting:', error);
      alert('Could not join the meeting. Please try again.');
    }
    
    setIncomingCall(null);
    setIsRinging(false);
  }, [incomingCall]);

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

        // Check if user is staff - with more robust detection
        let isStaff = false;
        
        try {
          const { data: staffData, error: staffError } = await supabase
            .from("staff")
            .select("user_id")
            .eq("user_id", user.id)
            .single();

          if (staffError) {
            // Alternative: Check if user is on staff messages page
            const currentPath = window.location.pathname;
            if (currentPath.includes('/staff/')) {
              console.log('✅ User detected as staff via URL path');
              isStaff = true;
            }
          } else if (staffData) {
            console.log('✅ User confirmed as staff via database');
            isStaff = true;
          }
        } catch (error) {
          console.warn('⚠️ Staff detection error:', error);
        }

        // Listen for incoming calls via real-time
        // Staff listens to staff-calls channel, patients listen to user channel
        const channelName = isStaff ? `staff-calls-${user.id}` : `user_${user.id}`;
        const channel = supabase.channel(channelName, {
          config: { broadcast: { ack: true } }
        });

        console.log('📡 Subscribing to channel:', channelName);

        channel
          .on("broadcast", { event: "incoming-call" }, (payload) => {
            if (!mounted) return;
            
            const callData = payload.payload as IncomingCall;
            console.log("📞 Incoming call received (incoming-call event):", callData);
            
            setIncomingCall(callData);
            setIsRinging(true);
            
            console.log("✅ Set incoming call and isRinging=true");
            
            // Auto-decline after 30 seconds if not answered
            setTimeout(() => {
              if (mounted) {
                console.log('⏰ Auto-declining call after timeout');
                setIncomingCall(null);
                setIsRinging(false);
              }
            }, 30000);
          })
          .on("broadcast", { event: "invite" }, (payload) => {
            if (!mounted) return;
            
            // Convert "invite" event to IncomingCall format
            const { conversationId, fromId, fromName, mode } = (payload.payload || {}) as any;
            if (!conversationId || !fromId) return;
            
            const callData: IncomingCall = {
              conversationId,
              callerId: fromId,
              callerName: fromName || "Caller",
              mode: (mode || "audio") as "audio" | "video",
              timestamp: new Date().toISOString(),
            };
            
            console.log("📞 Incoming call received (invite event):", callData);
            
            setIncomingCall(callData);
            setIsRinging(true);
            
            console.log("✅ Set incoming call and isRinging=true from invite");
            
            // Auto-decline after 30 seconds if not answered
            setTimeout(() => {
              if (mounted) {
                console.log('⏰ Auto-declining call after timeout');
                setIncomingCall(null);
                setIsRinging(false);
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
  }, []);

  return {
    incomingCall,
    isRinging,
    acceptCall,
    declineCall,
  };
}
