"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Send, Check, CheckCheck, Users, Image as ImageIcon, Camera, Mic, Square, Loader2, X } from "lucide-react";
import { uploadStaffChatFile, urlFromStaffChatPath } from "@/lib/staff-chat-upload";
import MessageAttachment from "./MessageAttachment";

export type GroupMessage = {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  created_at: string;
  read?: boolean;
  role_group?: string | null; // 'all', 'st', 'pt', 'hha', 'msw'
  attachment_url?: string | null;
  attachment_type?: "image" | "audio" | "file" | null;
};

type ChatGroup = {
  id: string;
  name: string;
  description: string;
  role_filter: string | null; // null = all, 'st', 'pt', 'hha', 'msw'
  message_count: number;
};

export default function StaffGroupChat() {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string; role?: string; title?: string } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<null | "image" | "audio">(null);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [draftAttachment, setDraftAttachment] = useState<{ blob: Blob; type: "image" | "audio"; previewUrl?: string } | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();

  // Get current user with staff info
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get staff profile
        const { data: staffData } = await supabase
          .from("staff")
          .select("first_name, last_name, title, role, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        const staff = staffData as { first_name?: string; last_name?: string; title?: string; role?: string; avatar_url?: string } | null;
        const firstName = staff?.first_name || "";
        const lastName = staff?.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || 
                         user.user_metadata?.full_name || 
                         user.email || 
                         "Staff Member";

        setCurrentUser({
          id: user.id,
          name: fullName,
          avatar: staff?.avatar_url || user.user_metadata?.avatar_url || undefined,
          role: staff?.role || undefined,
          title: staff?.title || undefined
        });
      }
    };
    getUser();
  }, []);

  // Initialize chat groups on mount
  useEffect(() => {
    const groups: ChatGroup[] = [
      { id: "all", name: "Staff Team Chat", description: "All staff members", role_filter: null, message_count: 0 },
      { id: "st", name: "ST Chat", description: "Staff", role_filter: "st", message_count: 0 },
      { id: "pt", name: "PT Chat", description: "Physical Therapists", role_filter: "pt", message_count: 0 },
      { id: "hha", name: "HHA Chat", description: "Home Health Aides", role_filter: "hha", message_count: 0 },
      { id: "msw", name: "MSW Chat", description: "Master of Social Work", role_filter: "msw", message_count: 0 },
    ];
    setChatGroups(groups);
  }, []);

  // Fetch messages for selected group
  const fetchMessages = async (groupFilter?: string) => {
    const filter = groupFilter || selectedGroup;
    try {
      setLoading(true);
      const roleFilter = filter === "all" ? null : filter;
      
      const { data, error } = await supabase
        .from('staff_group_chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        // Enhanced error logging
        console.error('Error fetching messages - full error:', JSON.stringify(error, null, 2));
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        console.error('Error details:', error?.details);
        console.error('Error hint:', error?.hint);
        
        // Check for common errors
        const errorCode = error?.code || '';
        const errorMessage = error?.message || '';
        
        if (errorCode === 'PGRST205' || errorCode === 'PGRST116' || 
            errorMessage.includes('does not exist') || 
            errorMessage.includes('Could not find the table')) {
          console.warn('⚠️ staff_group_chat_messages table does not exist. Please run the database migration.');
          toast.error('Chat table not found. Please run database migration.');
          setMessages([]);
          return;
        }
        
        if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
          console.warn('⚠️ Permission denied accessing staff_group_chat_messages. Check RLS policies.');
          toast.error('Permission denied. Check RLS policies.');
          setMessages([]);
          return;
        }
        
        toast.error(`Failed to load messages: ${errorMessage || 'Unknown error'}`);
        setMessages([]);
        return;
      }

      // Filter by role_group if not "all"
      let filteredMessages = (data || []) as GroupMessage[];
      if (roleFilter) {
        filteredMessages = filteredMessages.filter(m => m.role_group === roleFilter);
      } else {
        filteredMessages = filteredMessages.filter(m => !m.role_group || m.role_group === 'all');
      }

      // Sort by created_at to ensure proper order
      filteredMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(filteredMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription for postgres changes
  useEffect(() => {
    if (!selectedGroup) return;

    fetchMessages();

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Set up real-time subscription using postgres_changes
    const channel = supabase
      .channel(`staff-group-chat-${selectedGroup}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_group_chat_messages',
        },
        (payload) => {
          console.log('Real-time INSERT event received:', payload);
          const newMessage = payload.new as GroupMessage;
          const roleFilter = selectedGroup === "all" ? null : selectedGroup;
          
          // Only add message if it matches the selected group
          if (!roleFilter || newMessage.role_group === roleFilter || (!newMessage.role_group && selectedGroup === "all")) {
            console.log('Adding message to UI:', newMessage);
            setMessages(prev => {
              // Check if message already exists (from optimistic update)
              const exists = prev.some(m => m.id === newMessage.id || (m.id.startsWith('temp-') && m.sender_id === newMessage.sender_id && Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 2000));
              
              if (exists) {
                // Replace optimistic with real message
                return prev.map(m => 
                  (m.id === newMessage.id || (m.id.startsWith('temp-') && m.sender_id === newMessage.sender_id && Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 2000))
                    ? newMessage 
                    : m
                ).filter(m => !m.id.startsWith('temp-') || m.id === newMessage.id);
              } else {
                // Add new message and sort by timestamp
                const updated = [...prev, newMessage];
                return updated.sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              }
            });
          } else {
            console.log('Message filtered out - role_group mismatch:', { newMessage: newMessage.role_group, selectedGroup, roleFilter });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff_group_chat_messages',
        },
        (payload) => {
          console.log('Real-time UPDATE event received:', payload);
          const updatedMessage = payload.new as GroupMessage;
          setMessages(prev => {
            const updated = prev.map(m => m.id === updatedMessage.id ? updatedMessage : m);
            // Re-sort after update
            return updated.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to staff group chat changes');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !draftAttachment) || !currentUser || !selectedGroup || sending) return;

    const roleGroup = selectedGroup === "all" ? "all" : selectedGroup;
    const messageContent = newMessage.trim() || "";
    
    // Create optimistic message (will be replaced by real-time update)
    const optimisticMessage: GroupMessage = {
      id: `temp-${Date.now()}-${Math.random()}`,
      content: messageContent || (draftAttachment?.type === 'image' ? '(image)' : draftAttachment?.type === 'audio' ? '(voice note)' : ''),
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar || undefined,
      created_at: new Date().toISOString(),
      read: false,
      role_group: roleGroup,
      attachment_url: undefined,
      attachment_type: undefined
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);
    const messageToSend = messageContent;
    setNewMessage(""); // Clear input immediately for better UX

    try {
      let attachmentUrl: string | undefined;
      let attachmentType: "image" | "audio" | undefined;

      // Upload attachment if present
      if (draftAttachment) {
        setUploading(draftAttachment.type);
        try {
          attachmentUrl = await uploadStaffChatFile(draftAttachment.blob, {
            kind: draftAttachment.type,
            userId: currentUser.id,
            roleGroup
          });
          attachmentType = draftAttachment.type;
          
          // Update optimistic message with attachment
          optimisticMessage.attachment_url = attachmentUrl;
          optimisticMessage.attachment_type = attachmentType;
          
          if (draftAttachment.previewUrl) {
            URL.revokeObjectURL(draftAttachment.previewUrl);
          }
          setDraftAttachment(null);
        } catch (error: any) {
          console.error('Error uploading attachment:', error);
          // Remove optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          toast.error(`Failed to upload ${draftAttachment.type}: ${error?.message || 'Unknown error'}`);
          setUploading(null);
          setSending(false);
          setNewMessage(messageToSend); // Restore message
          return;
        }
      }

      setUploading(null);

      const requestBody = {
        content: messageToSend || (attachmentType === 'image' ? '(image)' : attachmentType === 'audio' ? '(voice note)' : ''),
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar,
        role_group: roleGroup,
        ...(attachmentUrl && { attachment_url: attachmentUrl, attachment_type: attachmentType })
      };

      // Get session token for Bearer auth (more reliable than cookies)
      let authHeader = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (err) {
        console.warn('Failed to get session token:', err);
      }

      console.log('Sending message to API:', {
        hasContent: !!requestBody.content,
        hasAttachment: !!attachmentUrl,
        roleGroup,
        senderId: requestBody.sender_id,
        hasAuthToken: !!authHeader
      });

      const response = await fetch('/api/staff/group-chat/messages', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: { 
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response status:', response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json();
        const savedMessage = responseData.message;
        console.log('Message sent successfully:', savedMessage);
        
        // Replace optimistic message with real one from server
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== optimisticMessage.id);
          // Check if real-time hasn't already added it
          const exists = filtered.some(m => m.id === savedMessage.id);
          if (!exists) {
            return [...filtered, savedMessage as GroupMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          return filtered;
        });
      } else {
        // Try to parse error response
        let errorMessage = 'Failed to send message';
        let errorDetails: any = null;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorDetails = await response.json();
            errorMessage = errorDetails.error || errorDetails.message || errorMessage;
            console.error('Failed to send message - full error:', JSON.stringify(errorDetails, null, 2));
            console.error('Error code:', errorDetails.errorCode);
            console.error('Error details:', errorDetails.details);
            console.error('Error hint:', errorDetails.hint);
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
            console.error('Failed to send message - non-JSON response:', response.status, text);
          }
        } catch (parseError: any) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        toast.error(errorMessage);
        setNewMessage(messageToSend); // Restore message
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      toast.error('Failed to send message');
      setNewMessage(messageToSend); // Restore message
    } finally {
      setSending(false);
      setUploading(null);
    }
  };

  // Image picker handlers
  const handlePickImage = () => imageInputRef.current?.click();
  const onImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const previewUrl = URL.createObjectURL(f);
    setDraftAttachment({ blob: f, type: "image", previewUrl });
    e.target.value = "";
  };

  // Camera capture handler
  const handleOpenCamera = () => cameraInputRef.current?.click();
  const onCameraCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const previewUrl = URL.createObjectURL(f);
    setDraftAttachment({ blob: f, type: "image", previewUrl });
    e.target.value = "";
  };

  // Voice recording handlers
  const startRecording = async () => {
    if (recording || !currentUser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      
      rec.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };
      
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        setDraftAttachment({ blob, type: "audio" });
        stream.getTracks().forEach((t) => t.stop());
      };
      
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      toast.error('Microphone permission denied or unsupported');
    }
  };

  const stopRecording = () => {
    if (!recorder) return;
    recorder.stop();
    setRecorder(null);
    setRecording(false);
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      try {
        if (recorder?.state === "recording") {
          recorder.stop();
        }
      } catch {}
    };
  }, [recorder]);

  // Get role label
  const getRoleLabel = (roleFilter: string | null) => {
    if (!roleFilter || roleFilter === "all") return "All Staff";
    const map: Record<string, string> = {
      "st": "Staff",
      "pt": "Physical Therapist",
      "hha": "Home Health Aide",
      "msw": "Master of Social Work"
    };
    return map[roleFilter] || roleFilter.toUpperCase();
  };

  // Get current group info
  const currentGroupInfo = useMemo(() => {
    return chatGroups.find(g => g.id === selectedGroup) || chatGroups[0];
  }, [chatGroups, selectedGroup]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const initials = (name?: string) => {
    if (!name) return "S";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const shouldShowContent = (content?: string) => {
    if (!content) return false;
    const t = content.trim().toLowerCase();
    return t && t !== "(image)" && t !== "(photo)" && t !== "(voice note)" && t !== "(file)";
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)]">
      {/* Groups Sidebar */}
      <div className="w-64 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-sm">Chat Groups</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                selectedGroup === group.id
                  ? "bg-cyan-100 border-2 border-cyan-500"
                  : "bg-slate-50 hover:bg-slate-100 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Users className="h-4 w-4 text-cyan-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-800 truncate">{group.name}</div>
                    <div className="text-xs text-slate-500 truncate">{group.description}</div>
                  </div>
                </div>
                {selectedGroup === group.id && (
                  <Badge variant="secondary" className="bg-cyan-500 text-white text-xs shrink-0">
                    {messages.length}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <section className="flex-1 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center">
                <Users className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-semibold text-slate-800">{currentGroupInfo?.name || "Staff Team Chat"}</h3>
                <p className="text-xs text-slate-500">{currentGroupInfo?.description || "All staff members"}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
            {messages.length} messages
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-slate-400 text-sm">No messages yet</div>
              <div className="text-slate-300 text-xs mt-1">Start the conversation</div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser?.id;
            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                  <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs">
                    {initials(message.sender_name)}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                  <div className={`rounded-2xl p-3 ${isOwnMessage ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <div className="text-sm font-medium mb-1">{message.sender_name}</div>
                    {/* Show attachment if present */}
                    {message.attachment_url && (
                      <MessageAttachment 
                        attachment_url={message.attachment_url} 
                        attachment_type={message.attachment_type ?? null}
                        isOwnMessage={isOwnMessage}
                      />
                    )}
                    {/* Show content if it's not just a placeholder */}
                    {shouldShowContent(message.content) && (
                    <div className={`text-sm whitespace-pre-wrap break-words ${isOwnMessage ? 'text-white' : 'text-slate-700'}`}>
                      {message.content}
                    </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{formatTime(message.created_at)}</span>
                    {isOwnMessage && (
                      message.read ? (
                        <CheckCheck className="h-3 w-3 text-cyan-600" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        {/* Draft attachment preview */}
        {draftAttachment && (
          <div className="mb-2 relative">
            {draftAttachment.type === "image" && draftAttachment.previewUrl && (
              <div className="relative inline-block">
                <img 
                  src={draftAttachment.previewUrl} 
                  alt="Preview" 
                  className="h-32 w-32 object-cover rounded-lg border-2 border-cyan-500"
                />
                <button
                  onClick={() => {
                    if (draftAttachment.previewUrl) URL.revokeObjectURL(draftAttachment.previewUrl);
                    setDraftAttachment(null);
                  }}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {draftAttachment.type === "audio" && (
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                <Mic className="h-4 w-4 text-cyan-600" />
                <span className="text-sm text-slate-700">Voice note ready</span>
                <button
                  onClick={() => setDraftAttachment(null)}
                  className="ml-auto h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attachment buttons */}
          <div className="flex items-center gap-1">
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              disabled={!!uploading || sending || !currentUser}
              onClick={handlePickImage}
              title="Upload image"
            >
              {uploading === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImagePicked}
            />
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              disabled={!!uploading || sending || !currentUser}
              onClick={handleOpenCamera}
              title="Take photo"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onCameraCaptured}
            />
            {!recording ? (
              <Button 
                type="button" 
                size="icon" 
                variant="ghost" 
                disabled={!!uploading || sending || !currentUser}
                onClick={startRecording}
                title="Record voice"
              >
                <Mic className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button" 
                size="icon" 
                variant="destructive"
                onClick={stopRecording}
                title="Stop recording"
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !sending) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={draftAttachment ? "Add a caption (optional)..." : "Type a message..."}
            className="flex-1 bg-white"
            disabled={!currentUser || sending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={(!newMessage.trim() && !draftAttachment) || !currentUser || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-xs text-slate-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
          {recording && <span className="ml-2 text-red-500">● Recording...</span>}
        </div>
      </div>
    </section>
    </div>
  );
}
