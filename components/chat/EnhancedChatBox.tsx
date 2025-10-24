"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Video,
  Send,
  Mic,
  MessageCircle,
  PhoneOff,
  VideoOff,
} from "lucide-react";
import { useAutoWebRTCCall } from "@/hooks/useAutoWebRTCCall";
import IncomingCallBanner from "@/components/call/IncomingCallBanner";

interface EnhancedChatBoxProps {
  conversationId: string;
  patientId: string;
  providerId?: string;
  providerName?: string;
  providerRole?: string;
  providerAvatarUrl?: string | null;
  patientName?: string | null;
  patientAvatarUrl?: string | null;
  mode?: "staff" | "patient";
}

export default function EnhancedChatBox({
  conversationId,
  patientId,
  providerId,
  providerName,
  providerRole,
  providerAvatarUrl,
  patientName,
  patientAvatarUrl,
  mode = "staff",
}: EnhancedChatBoxProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [me, setMe] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callMode, setCallMode] = useState<"audio" | "video">("video");
  const [showCallControls, setShowCallControls] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMe({ id: user.id, name: user.user_metadata?.full_name, email: user.email });
      }
    };
    getCurrentUser();
  }, []);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;
    
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages/${conversationId}?limit=50`);
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };
    
    loadMessages();
  }, [conversationId]);

  // Real-time message subscription
  useEffect(() => {
    if (!conversationId) return;
    
    const channel = supabase
      .channel(`msg:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as any) : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Listen for incoming calls
  useEffect(() => {
    if (!me?.id) return;
    
    const channel = supabase.channel(`staff-calls-${me.id}`, {
      config: { broadcast: { ack: true } }
    });

    channel
      .on("broadcast", { event: "incoming-call" }, (payload) => {
        const callData = payload.payload;
        console.log("Incoming call received:", callData);
        setIncomingCall(callData);
      })
      .on("broadcast", { event: "invite" }, (payload) => {
        const { conversationId: callConvId, fromId, fromName, mode: callMode } = payload.payload;
        if (callConvId === conversationId) {
          const callData = {
            conversationId: callConvId,
            callerId: fromId,
            callerName: fromName,
            mode: callMode,
            timestamp: new Date().toISOString()
          };
          setIncomingCall(callData);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.id, conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !conversationId || !me?.id || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage("");
      } else {
        console.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, conversationId, me?.id, isLoading]);

  // Start video call
  const startVideoCall = useCallback(async () => {
    if (!me?.id || !providerId) return;
    
    try {
      // Send call invitation
      const response = await fetch("/api/video-call/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          calleeId: providerId,
          callType: "video",
          message: "Incoming video call",
        }),
      });

      if (response.ok) {
        setCallMode("video");
        setIsCallActive(true);
        setShowCallControls(true);
        
        // Navigate to auto-call page
        router.push(`/call-auto/${conversationId}?role=caller&mode=video&peer=${encodeURIComponent(providerId)}&peerName=${encodeURIComponent(providerName || "Contact")}`);
      }
    } catch (error) {
      console.error("Failed to start video call:", error);
    }
  }, [me?.id, providerId, conversationId, providerName, router]);

  // Start audio call
  const startAudioCall = useCallback(async () => {
    if (!me?.id || !providerId) return;
    
    try {
      // Send call invitation
      const response = await fetch("/api/video-call/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          calleeId: providerId,
          callType: "audio",
          message: "Incoming audio call",
        }),
      });

      if (response.ok) {
        setCallMode("audio");
        setIsCallActive(true);
        setShowCallControls(true);
        
        // Navigate to auto-call page
        router.push(`/call-auto/${conversationId}?role=caller&mode=audio&peer=${encodeURIComponent(providerId)}&peerName=${encodeURIComponent(providerName || "Contact")}`);
      }
    } catch (error) {
      console.error("Failed to start audio call:", error);
    }
  }, [me?.id, providerId, conversationId, providerName, router]);

  // Accept incoming call
  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    
    setCallMode(incomingCall.mode);
    setIsCallActive(true);
    setShowCallControls(true);
    setIncomingCall(null);
    
    // Navigate to auto-call page
    router.push(`/call-auto/${incomingCall.conversationId}?role=callee&mode=${incomingCall.mode}&peer=${encodeURIComponent(incomingCall.callerId)}&peerName=${encodeURIComponent(incomingCall.callerName || "Caller")}&autoAccept=true`);
  }, [incomingCall, router]);

  // Decline incoming call
  const declineIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      // Send decline response
      await fetch("/api/video-call/invite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: incomingCall.invitation_id || "unknown",
          status: "declined",
        }),
      });
    } catch (error) {
      console.error("Failed to decline call:", error);
    }
    
    setIncomingCall(null);
  }, [incomingCall]);

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Incoming Call Banner */}
      {incomingCall && (
        <IncomingCallBanner
          callerName={incomingCall.callerName || incomingCall.fromName}
          mode={incomingCall.mode}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={mode === "staff" ? patientAvatarUrl || undefined : providerAvatarUrl || undefined} />
            <AvatarFallback>
              {mode === "staff" 
                ? (patientName || "P").charAt(0).toUpperCase()
                : (providerName || "S").charAt(0).toUpperCase()
              }
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {mode === "staff" ? patientName || "Patient" : providerName || "Staff"}
            </h3>
            <p className="text-sm text-gray-500">
              {mode === "staff" ? "Patient" : providerRole || "Staff Member"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isCallActive && (
            <Badge variant="default" className="bg-green-600">
              Call Active
            </Badge>
          )}
          <Button
            onClick={startAudioCall}
            variant="outline"
            size="sm"
            disabled={!providerId || isCallActive}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            onClick={startVideoCall}
            variant="outline"
            size="sm"
            disabled={!providerId || isCallActive}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === me?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender_id === me?.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

