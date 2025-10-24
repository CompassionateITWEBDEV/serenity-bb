"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Video,
  Send,
  ArrowLeft,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId || "";

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [me, setMe] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [peerInfo, setPeerInfo] = useState<{ name?: string; avatar?: string }>({});
  const [isCallActive, setIsCallActive] = useState(false);
  const [callMode, setCallMode] = useState<"audio" | "video">("video");

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const startVideoCall = useCallback(() => {
    if (!me?.id) return;
    
    setCallMode("video");
    setIsCallActive(true);
    
    // Navigate to video call page
    router.push(`/video-call/${conversationId}?role=caller&mode=video&peer=${encodeURIComponent(me.id)}&peerName=${encodeURIComponent(me.name || "You")}`);
  }, [me?.id, me?.name, conversationId, router]);

  // Start audio call
  const startAudioCall = useCallback(() => {
    if (!me?.id) return;
    
    setCallMode("audio");
    setIsCallActive(true);
    
    // Navigate to video call page
    router.push(`/video-call/${conversationId}?role=caller&mode=audio&peer=${encodeURIComponent(me.id)}&peerName=${encodeURIComponent(me.name || "You")}`);
  }, [me?.id, me?.name, conversationId, router]);

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show loading state
  if (!me?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={peerInfo.avatar} />
            <AvatarFallback>
              {peerInfo.name?.charAt(0).toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{peerInfo.name || "Contact"}</h3>
            <p className="text-sm text-gray-500">Online</p>
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
            disabled={isCallActive}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            onClick={startVideoCall}
            variant="outline"
            size="sm"
            disabled={isCallActive}
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

