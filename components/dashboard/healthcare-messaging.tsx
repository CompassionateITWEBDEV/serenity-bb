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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Star,
  Archive,
  Settings,
  Plus,
  UserPlus,
  Bell,
  BellOff,
  AlertTriangle,
  Heart,
  ThumbsUp,
  Reply,
  Forward,
  Copy,
  Download,
  Eye,
  EyeOff,
  Pin,
  Pin as Unpin,
  Edit,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Activity,
  Zap,
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
  favorite?: boolean;
  archived?: boolean;
  priority?: "low" | "normal" | "high" | "urgent";
  lastSeen?: string;
  status?: "active" | "away" | "busy" | "offline";
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
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<ProviderRole | "all">("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRead, setAutoRead] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [messageStatus, setMessageStatus] = useState<Record<string, "sending" | "sent" | "delivered" | "read" | "failed">>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteMenu && !(event.target as Element).closest('.delete-menu')) {
        setShowDeleteMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteMenu]);

  // Enhanced filtering and search
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(conv => 
        conv.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== "all") {
      filtered = filtered.filter(conv => conv.providerRole === filterRole);
    }

    // Favorites filter
    if (showFavorites) {
      filtered = filtered.filter(conv => conv.favorite);
    }

    // Archived filter
    if (showArchived) {
      filtered = filtered.filter(conv => conv.archived);
    }

    return filtered.sort((a, b) => {
      // Sort by unread count first, then by last message time
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }, [conversations, searchQuery, filterRole, showFavorites, showArchived]);

  // Enhanced message actions
  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const currentReactions = messageReactions[messageId] || [];
      const newReactions = currentReactions.includes(emoji) 
        ? currentReactions.filter(r => r !== emoji)
        : [...currentReactions, emoji];
      
      setMessageReactions(prev => ({ ...prev, [messageId]: newReactions }));
      
      // Update in database
      const { error } = await supabase
        .from("messages")
        .update({ reactions: newReactions })
        .eq("id", messageId);
      
      if (error) {
        console.error("Error updating reactions:", error);
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const togglePinMessage = (messageId: string) => {
    const newPinned = new Set(pinnedMessages);
    if (newPinned.has(messageId)) {
      newPinned.delete(messageId);
    } else {
      newPinned.add(messageId);
    }
    setPinnedMessages(newPinned);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const forwardMessage = (message: Message) => {
    // Implementation for forwarding messages
    console.log("Forwarding message:", message);
  };

  const replyToMessage = (message: Message) => {
    setNewMessage(`@${message.senderName} `);
    inputRef.current?.focus();
  };

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
              supabase.from("messages").update({ read: true }).eq("id", m.id);
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
    if (ch) ch.send({ type: "broadcast", event: "typing", payload: { who: PATIENT_ID } });
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
      .neq("sender_role", "patient");
  }

  async function deleteMessage(messageId: string, conversationId: string) {
    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to delete this message? This action cannot be undone.");
    if (!confirmed) {
      setShowDeleteMenu(null);
      return;
    }

    try {
      // Delete from database
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message. Please try again.");
        return;
      }

      // Update local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
            : c
        )
      );

      // Close delete menu
      setShowDeleteMenu(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  }

  return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
        {/* Enhanced Conversations List */}
        <Card className="lg:col-span-1 border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Healthcare Team
                  </CardTitle>
                  <CardDescription className="text-sm">Real-time messages from your care providers</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowSettings(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowFavorites(!showFavorites)}>
                    <Star className="h-4 w-4 mr-2" />
                    {showFavorites ? "Hide Favorites" : "Show Favorites"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowArchived(!showArchived)}>
                    <Archive className="h-4 w-4 mr-2" />
                    {showArchived ? "Hide Archived" : "Show Archived"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Enhanced Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-9"
                />
              </div>
              
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Filter className="h-4 w-4 mr-2" />
                      {filterRole === "all" ? "All Roles" : filterRole}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setFilterRole("all")}>All Roles</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterRole("doctor")}>Doctors</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterRole("nurse")}>Nurses</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterRole("counselor")}>Counselors</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant={showFavorites ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFavorites(!showFavorites)}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No conversations found</p>
                  <p className="text-sm text-gray-400">
                    {searchQuery ? "Try adjusting your search" : "Start a conversation with your care team"}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation, index) => (
                  <div key={conversation.id}>
                    <div
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 group ${
                        selectedConversation === conversation.id 
                          ? "bg-gradient-to-r from-blue-50 to-purple-50 border-r-4 border-blue-500 shadow-sm" 
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation.id);
                        markAsRead(conversation.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                            <AvatarImage src={conversation.providerAvatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              {conversation.providerName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            conversation.online ? "bg-green-500" : "bg-gray-400"
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">{conversation.providerName}</h4>
                              {conversation.favorite && (
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              )}
                              {conversation.priority === "urgent" && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : "—"}
                              </span>
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${roleBadge(conversation.providerRole)} text-xs`} variant="secondary">
                              {conversation.providerRole}
                            </Badge>
                            {conversation.online && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                                Online
                              </Badge>
                            )}
                            {conversation.status && conversation.status !== "offline" && (
                              <Badge variant="outline" className="text-xs">
                                {conversation.status}
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
                      </div>
                    </div>
                    {index < filteredConversations.length - 1 && <Separator className="mx-4" />}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Enhanced Chat Interface */}
        <Card className="lg:col-span-3 border-0 shadow-lg">
          {selectedConv ? (
            <>
              {/* Enhanced Chat Header */}
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-4 ring-white shadow-lg">
                        <AvatarImage src={selectedConv.providerAvatar || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                          {selectedConv.providerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        selectedConv.online ? "bg-green-500" : "bg-gray-400"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">{selectedConv.providerName}</h3>
                        {selectedConv.favorite && (
                          <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        )}
                        {selectedConv.priority === "urgent" && (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${roleBadge(selectedConv.providerRole)} text-sm font-medium`} variant="secondary">
                          {selectedConv.providerRole}
                        </Badge>
                        {selectedConv.typing ? (
                          <span className="text-sm text-blue-600 flex items-center gap-1 font-medium">
                            <Circle className="w-2 h-2 animate-pulse" />
                            typing...
                          </span>
                        ) : selectedConv.online ? (
                          <span className="text-sm text-green-600 flex items-center gap-1 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            Online
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Last seen {formatTime(selectedConv.lastSeen || selectedConv.lastMessageTime)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={!selectedConv.online} className="h-9 w-9 p-0" title="Voice Call">
                      <Phone className="h-4 w-4" />
                    </Button>
                    
                    <Button size="sm" variant="outline" disabled={!selectedConv.online} className="h-9 w-9 p-0" title="Video Call">
                      <Video className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowSettings(true)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              {/* Enhanced Messages Area */}
              <CardContent className="p-0">
                <ScrollArea className="h-[450px] p-6">
                  <div className="space-y-6">
                    {selectedConv.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderRole === "patient" ? "justify-end" : "justify-start"} group`}
                      >
                        <div className={`max-w-[75%] relative`}>
                          {/* Pinned message indicator */}
                          {pinnedMessages.has(message.id) && (
                            <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
                              <Pin className="h-3 w-3" />
                              <span>Pinned message</span>
                            </div>
                          )}
                          
                          <div
                            className={`rounded-2xl p-4 shadow-sm relative ${
                              message.senderRole === "patient" 
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                                : "bg-white border border-gray-200 text-gray-900"
                            } ${!message.read && message.senderRole !== "patient" ? "ring-2 ring-blue-200" : ""}`}
                          >
                            {message.senderRole !== "patient" && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold opacity-80">{message.senderName}</span>
                                {message.urgent && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">URGENT</Badge>
                                )}
                              </div>
                            )}
                            
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            
                            {/* Message reactions */}
                            {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                {messageReactions[message.id].map((reaction, idx) => (
                                  <Button
                                    key={idx}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30"
                                    onClick={() => addReaction(message.id, reaction)}
                                  >
                                    {reaction}
                                  </Button>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                              <div className="flex items-center gap-2">
                                {message.senderRole === "patient" && (
                                  <div className="flex items-center gap-1">
                                    {messageStatus[message.id] === "sending" && <Clock className="h-3 w-3 opacity-70" />}
                                    {messageStatus[message.id] === "sent" && <CheckCircle2 className="h-3 w-3 opacity-70" />}
                                    {messageStatus[message.id] === "delivered" && <CheckCircle2 className="h-3 w-3 opacity-70" />}
                                    {messageStatus[message.id] === "read" && <CheckCircle2 className="h-3 w-3 text-blue-300" />}
                                    {messageStatus[message.id] === "failed" && <AlertTriangle className="h-3 w-3 text-red-300" />}
                                  </div>
                                )}
                                
                                {/* Enhanced message actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-white/20"
                                    onClick={() => addReaction(message.id, "👍")}
                                    title="React"
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-white/20"
                                    onClick={() => replyToMessage(message)}
                                    title="Reply"
                                  >
                                    <Reply className="h-3 w-3" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-white/20"
                                    onClick={() => copyMessage(message.content)}
                                    title="Copy"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  
                                  {message.senderRole === "patient" && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 hover:bg-white/20"
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => togglePinMessage(message.id)}>
                                          {pinnedMessages.has(message.id) ? <Unpin className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                                          {pinnedMessages.has(message.id) ? "Unpin" : "Pin"} Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => forwardMessage(message)}>
                                          <Forward className="h-4 w-4 mr-2" />
                                          Forward
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-red-600"
                                          onClick={() => deleteMessage(message.id, selectedConv.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Enhanced typing indicator */}
                    {selectedConv.typing && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-[75%] shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                            </div>
                            <span className="text-sm text-gray-500 italic">
                              {selectedConv.providerName} is typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* Enhanced Input Area */}
                <div className="border-t bg-gray-50 p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0" title="Attach File">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0" title="Voice Message">
                        <Mic className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 relative">
                      <Textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={selectedConv.online ? "Type your message..." : "Provider is offline"}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="min-h-[40px] max-h-[120px] resize-none pr-12"
                        disabled={!selectedConv.online}
                        rows={1}
                      />
                      
                      <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Emoji">
                          <Smile className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || !selectedConv.online}
                      className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isTyping && (
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Circle className="w-2 h-2 animate-pulse" />
                      You are typing...
                    </div>
                  )}
                  
                  {!selectedConv.online && (
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Provider is offline. Messages will be delivered when they come online.
                    </div>
                  )}
                </div>
              </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                <MessageSquare className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation to start messaging</h3>
              <p className="text-gray-600 mb-6">Real-time chat with your healthcare team</p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Encrypted</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
