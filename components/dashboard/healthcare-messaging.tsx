// ./components/dashboard/healthcare-messaging.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Send,
  Phone,
  Video,
  Clock,
  CheckCircle2,
  Circle,
  Mic,
  Paperclip,
  Smile,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/* ---------- Types ---------- */
type Role = "patient" | "doctor" | "nurse" | "counselor";
type ProviderRole = Exclude<Role, "patient">;

interface DBConversation {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_role: ProviderRole;
  provider_avatar: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
}
interface DBMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: Role;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  content: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
}

interface Conversation {
  id: string;
  providerId: string;
  providerName: string;
  providerRole: ProviderRole;
  providerAvatar?: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
  typing: boolean;
  messages: Message[];
}

/* ---------- Constants ---------- */
// Replace with your auth context if available
const PATIENT_ID = "patient";
const PATIENT_NAME = "You";

/* ---------- Utils ---------- */
function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 36e5;
  return diffH < 24 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
}
function roleBadge(role: ProviderRole) {
  return role === "doctor"
    ? "bg-blue-100 text-blue-800"
    : role === "nurse"
    ? "bg-green-100 text-green-800"
    : "bg-purple-100 text-purple-800";
}

/* ---------- Component ---------- */
export function HealthcareMessaging() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load conversations list once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select(
            "id,provider_id,provider_name,provider_role,provider_avatar,last_message:last_message, last_message_at:last_message_at, unread_count:unread_count",
          )
          .order("last_message_at", { ascending: false, nullsFirst: false });
        if (error) throw error;

        const mapped: Conversation[] =
          (data as DBConversation[]).map((c) => ({
            id: c.id,
            providerId: c.provider_id,
            providerName: c.provider_name,
            providerRole: c.provider_role,
            providerAvatar: c.provider_avatar,
            lastMessage: c.last_message ?? "",
            lastMessageTime: c.last_message_at ?? "",
            unreadCount: c.unread_count ?? 0,
            online: false,
            typing: false,
            messages: [],
          })) ?? [];

        if (active) {
          setConversations(mapped);
          if (mapped.length && !selectedConversation) setSelectedConversation(mapped[0].id);
        }
      } catch (e) {
        console.warn("[chat] conversations load failed", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line

  // When a conversation is selected, fetch messages + setup realtime
  useEffect(() => {
    const convId = selectedConversation;
    if (!convId) return;

    let alive = true;

    // 1) load history
    (async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            "id,conversation_id,sender_id,sender_name,sender_role,content,created_at,read,urgent",
          )
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true })
          .limit(500);
        if (error) throw error;

        const msgs: Message[] = (data as DBMessage[]).map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderRole: m.sender_role,
          content: m.content,
          timestamp: m.created_at,
          read: m.read,
          urgent: m.urgent,
        }));

        if (!alive) return;
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, messages: msgs } : c)),
        );
        // mark as read
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("conversation_id", convId)
          .neq("sender_role", "patient");
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
        );
      } catch (e) {
        console.warn("[chat] messages load failed", e);
      }
    })();

    // 2) realtime—DB changes for messages
    if (msgSubRef.current) msgSubRef.current.unsubscribe();
    const msgSub = supabase
      .channel(`messages:${convId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          if (!alive) return;
          if (payload.eventType === "INSERT") {
            const m = payload.new as DBMessage;
            const mapped: Message = {
              id: m.id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              content: m.content,
              timestamp: m.created_at,
              read: m.read,
              urgent: m.urgent,
            };
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: [...c.messages, mapped],
                      lastMessage: mapped.content,
                      lastMessageTime: mapped.timestamp,
                    }
                  : c,
              ),
            );
            // auto-mark read for provider → patient view
            if (mapped.senderRole !== "patient") {
              supabase.from("messages").update({ read: true }).eq("id", m.id).catch(() => {});
            }
          } else if (payload.eventType === "UPDATE") {
            const m = payload.new as DBMessage;
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: c.messages.map((x) => (x.id === m.id ? { ...x, read: m.read } : x)),
                    }
                  : c,
              ),
            );
          }
        },
      )
      .subscribe();
    msgSubRef.current = msgSub;

    // 3) presence + typing channel
    if (presenceChannelRef.current) presenceChannelRef.current.unsubscribe();
    const ch = supabase.channel(`conv:${convId}`, {
      config: { broadcast: { self: true }, presence: { key: PATIENT_ID } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      // any provider presence key sets online=true
      const others = Object.keys(state).filter((k) => k !== PATIENT_ID);
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, online: others.length > 0 } : c)));
    });

    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!alive) return;
      const who = payload?.who as string | undefined;
      if (who && who !== PATIENT_ID) {
        setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, typing: true } : c)));
        setTimeout(() => {
          setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, typing: false } : c)));
        }, 1500);
      }
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ id: PATIENT_ID, name: PATIENT_NAME, role: "patient" });
      }
    });
    presenceChannelRef.current = ch;

    return () => {
      alive = false;
      msgSub.unsubscribe();
      ch.unsubscribe();
    };
  }, [selectedConversation]);

  // patient typing → broadcast
  useEffect(() => {
    if (!newMessage.trim()) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000);

    const ch = presenceChannelRef.current;
    if (ch) ch.send({ type: "broadcast", event: "typing", payload: { who: PATIENT_ID } }).catch(() => {});
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [newMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, selectedConversation]);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedConversation) || null,
    [conversations, selectedConversation],
  );

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;
    const conv = conversations.find((c) => c.id === selectedConversation);
    if (!conv) return;

    const content = newMessage.trim();
    setNewMessage("");

    // optimistic
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: PATIENT_ID,
      senderName: PATIENT_NAME,
      senderRole: "patient",
      content,
      timestamp: new Date().toISOString(),
      read: true,
      urgent: false,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              messages: [...c.messages, optimistic],
              lastMessage: content,
              lastMessageTime: optimistic.timestamp,
            }
          : c,
      ),
    );

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conv.id,
          sender_id: PATIENT_ID,
          sender_name: PATIENT_NAME,
          sender_role: "patient",
          content,
          read: true,
          urgent: false,
        })
        .select("*")
        .single<DBMessage>();
      if (error) throw error;
      // reconcile temp -> real row
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === tempId
                    ? {
                        id: data.id,
                        senderId: data.sender_id,
                        senderName: data.sender_name,
                        senderRole: data.sender_role,
                        content: data.content,
                        timestamp: data.created_at,
                        read: data.read,
                        urgent: data.urgent,
                      }
                    : m,
                ),
              }
            : c,
        ),
      );
    } catch (e) {
      // fallback: mark failed
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === tempId ? { ...m, content: `${content} (failed to send)` } : m,
                ),
              }
            : c,
        ),
      );
    }
  }

  function markAsRead(conversationId: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) } : c)),
    );
    supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_role", "patient")
      .catch(() => {});
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Healthcare Team
          </CardTitle>
          <CardDescription>Real-time messages from your care providers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {conversations.map((conversation, index) => (
              <div key={conversation.id}>
                <div
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation.id);
                    markAsRead(conversation.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversation.providerAvatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {conversation.providerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{conversation.providerName}</h4>
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={roleBadge(conversation.providerRole)} variant="secondary">
                          {conversation.providerRole}
                        </Badge>
                        {conversation.online && (
                          <Badge variant="outline" className="text-xs">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                            Online
                          </Badge>
                        )}
                      </div>
                      {conversation.typing ? (
                        <p className="text-sm text-blue-600 italic flex items-center gap-1">
                          <Circle className="h-2 w-2 animate-pulse" />
                          typing...
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                {index < conversations.length - 1 && <Separator />}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2">
        {selectedConv ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConv.providerAvatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedConv.providerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedConv.providerName}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={roleBadge(selectedConv.providerRole)} variant="secondary">
                        {selectedConv.providerRole}
                      </Badge>
                      {selectedConv.typing ? (
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 animate-pulse" />
                          typing...
                        </span>
                      ) : selectedConv.online ? (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Online
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Offline</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={!selectedConv.online}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={!selectedConv.online}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px] p-4">
                <div className="space-y-4">
                  {selectedConv.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderRole === "patient" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderRole === "patient" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                        } ${!message.read && message.senderRole !== "patient" ? "ring-2 ring-blue-200" : ""}`}
                      >
                        {message.senderRole !== "patient" && (
                          <div className="text-xs font-medium mb-1 opacity-70">{message.senderName}</div>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                          {message.senderRole === "patient" && (
                            <div className="ml-2">
                              {message.read ? <CheckCircle2 className="h-3 w-3 opacity-70" /> : <Clock className="h-3 w-3 opacity-70" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedConv.typing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 max-w-[70%]">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="px-2 bg-transparent">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="px-2 bg-transparent">
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedConv.online ? "Type your message..." : "Provider is offline"}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                    disabled={!selectedConv.online}
                  />
                  <Button size="sm" variant="outline" className="px-2 bg-transparent">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button onClick={sendMessage} disabled={!newMessage.trim() || !selectedConv.online}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {isTyping && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Circle className="w-2 h-2 animate-pulse" />
                    You are typing...
                  </div>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
              <p className="text-sm mt-2">Real-time chat with your healthcare team</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
