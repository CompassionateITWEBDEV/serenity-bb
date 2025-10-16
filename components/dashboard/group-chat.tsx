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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Send, Settings, UserPlus, Heart, Trash2, Plus, Loader2, 
  Search, Filter, Star, Archive, MoreHorizontal, ChevronDown, ChevronUp,
  MessageSquare, Phone, Video, Mic, Paperclip, Smile, ThumbsUp, Reply,
  Forward, Copy, Download, Eye, EyeOff, Pin, Edit, MoreVertical,
  AlertTriangle, Shield, Activity, Zap, Sparkles, Clock, CheckCircle2,
  Circle, Bell, BellOff, Hash, Lock, Unlock, Crown, Award, Target
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type GroupType = "support" | "therapy" | "recovery" | "social";
type Role = "patient" | "facilitator" | "counselor";

type Group = {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  facilitator_name: string | null;
  created_by: string;
  members: Member[];
  member_count: number;
  favorite?: boolean;
  archived?: boolean;
  priority?: "low" | "normal" | "high" | "urgent";
  last_activity?: string;
  status?: "active" | "paused" | "archived";
  is_private?: boolean;
  max_members?: number;
};

type Member = {
  group_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  name?: string | null;
  avatar?: string | null;
};

type Message = {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: Role;
  content: string;
  supportive: boolean;
  reactions: { emoji: string; count: number; users: string[] }[];
  created_at: string;
};

export function GroupChat() {
  const { isAuthenticated, patient } = useAuth();
  const userId = (patient?.id) as string | undefined;

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [form, setForm] = useState<{ name: string; description: string; type: GroupType }>({
    name: "",
    description: "",
    type: "support",
  });
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<GroupType | "all">("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [messageStatus, setMessageStatus] = useState<Record<string, "sending" | "sent" | "delivered" | "read" | "failed">>({});
  const [showMembers, setShowMembers] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(group => group.type === filterType);
    }

    // Favorites filter
    if (showFavorites) {
      filtered = filtered.filter(group => group.favorite);
    }

    // Archived filter
    if (showArchived) {
      filtered = filtered.filter(group => group.archived);
    }

    return filtered.sort((a, b) => {
      // Sort by member count first, then by name
      if (a.member_count !== b.member_count) {
        return b.member_count - a.member_count;
      }
      return a.name.localeCompare(b.name);
    });
  }, [groups, searchQuery, filterType, showFavorites, showArchived]);

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
        .from("group_messages")
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
    setNewMessage(`@${message.sender_name} `);
    inputRef.current?.focus();
  };

  // ---- helpers
  function formatTime(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 36e5;
    return diffH < 24 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
  }

  function typeColor(t: GroupType) {
    return t === "support"
      ? "bg-green-100 text-green-800"
      : t === "therapy"
      ? "bg-blue-100 text-blue-800"
      : t === "recovery"
      ? "bg-purple-100 text-purple-800"
      : "bg-orange-100 text-orange-800";
  }
  function roleColor(r: Role) {
    return r === "facilitator"
      ? "bg-blue-100 text-blue-800"
      : r === "counselor"
      ? "bg-purple-100 text-purple-800"
      : "bg-gray-100 text-gray-800";
  }

  // ---- load my groups
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      setLoadingGroups(true);
      try {
        // groups where I'm a member
        const { data: memberships, error: mErr } = await supabase
          .from("group_members")
          .select("group_id, role, joined_at, groups:group_id(id, name, description, type, facilitator_name, created_by)")
          .eq("user_id", userId);
        if (mErr) throw mErr;

        const unique: Record<string, Group> = {};
        (memberships || []).forEach((m: any) => {
          const g = m.groups;
          unique[g.id] = {
            id: g.id,
            name: g.name,
            description: g.description,
            type: g.type,
            facilitator_name: g.facilitator_name,
            created_by: g.created_by,
            members: [],
            member_count: 0,
          };
        });

        // member counts + member list (basic)
        const groupIds = Object.keys(unique);
        if (groupIds.length) {
          const { data: members } = await supabase
            .from("group_members")
            .select("group_id, user_id, role, joined_at")
            .in("group_id", groupIds);
          (members || []).forEach((mm) => {
            unique[mm.group_id].members.push(mm as Member);
          });
          groupIds.forEach((id) => (unique[id].member_count = unique[id].members.length));
        }

        if (alive) {
          const list = Object.values(unique).sort((a, b) => a.name.localeCompare(b.name));
          setGroups(list);
          if (!selectedGroupId && list.length) setSelectedGroupId(list[0].id);
        }
      } catch (e) {
        console.warn("[groups] load failed", e);
      } finally {
        if (alive) setLoadingGroups(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // ---- load messages + realtime for selected group
  useEffect(() => {
    const gid = selectedGroupId;
    if (!gid) return;

    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("group_messages")
          .select("*")
          .eq("group_id", gid)
          .order("created_at", { ascending: true })
          .limit(500);
        if (error) throw error;
        if (alive) {
          setMessages((prev) => ({ ...prev, [gid]: (data as Message[]) || [] }));
        }
      } catch (e) {
        console.warn("[messages] load failed", e);
      }
    })();

    if (msgChannelRef.current) msgChannelRef.current.unsubscribe();
    const ch = supabase
      .channel(`grp:${gid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_messages", filter: `group_id=eq.${gid}` },
        (payload) => {
          if (!alive) return;
          if (payload.eventType === "INSERT") {
            const m = payload.new as Message;
            setMessages((prev) => ({ ...prev, [gid]: [...(prev[gid] || []), m] }));
          } else if (payload.eventType === "UPDATE") {
            const m = payload.new as Message;
            setMessages((prev) => ({
              ...prev,
              [gid]: (prev[gid] || []).map((x) => (x.id === m.id ? (m as Message) : x)),
            }));
          } else if (payload.eventType === "DELETE") {
            const m = payload.old as Message;
            setMessages((prev) => ({
              ...prev,
              [gid]: (prev[gid] || []).filter((x) => x.id !== m.id),
            }));
          }
        },
      )
      .subscribe();
    msgChannelRef.current = ch;

    return () => {
      alive = false;
      ch.unsubscribe();
    };
  }, [selectedGroupId]);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) || null, [groups, selectedGroupId]);
  const selectedMessages = messages[selectedGroupId || ""] || [];

  // ---- actions
  async function sendMessage() {
    if (!newMessage.trim() || !selectedGroupId || !userId) return;
    const content = newMessage.trim();
    setNewMessage("");

    // optimistic
    const temp: Message = {
      id: `temp-${Date.now()}`,
      group_id: selectedGroupId,
      sender_id: userId,
      sender_name: patient?.firstName || "You",
      sender_role: "patient",
      content,
      supportive: false,
      reactions: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => ({ ...prev, [selectedGroupId]: [...(prev[selectedGroupId] || []), temp] }));

    try {
      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          group_id: selectedGroupId,
          sender_id: userId,
          sender_name: temp.sender_name,
          sender_role: "patient",
          content,
          supportive: false,
        })
        .select("*")
        .single<Message>();
      if (error) throw error;
      setMessages((prev) => ({
        ...prev,
        [selectedGroupId]: (prev[selectedGroupId] || []).map((m) => (m.id === temp.id ? data : m)),
      }));
    } catch (e) {
      // mark failed
      setMessages((prev) => ({
        ...prev,
        [selectedGroupId]: (prev[selectedGroupId] || []).map((m) =>
          m.id === temp.id ? { ...m, content: `${content} (failed)` } : m,
        ),
      }));
    }
  }


  async function deleteMessage(messageId: string) {
    if (!selectedGroupId || !userId) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to delete this message? This action cannot be undone.");
    if (!confirmed) {
      setShowDeleteMenu(null);
      return;
    }

    try {
      // Delete from database
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message. Please try again.");
        return;
      }

      // Update local state
      setMessages((prev) => ({
        ...prev,
        [selectedGroupId]: (prev[selectedGroupId] || []).filter((m) => m.id !== messageId),
      }));

      // Close delete menu
      setShowDeleteMenu(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  }

  async function createGroup() {
    if (!userId || !form.name.trim()) return;
    setCreating(true);
    try {
      const { data: g, error } = await supabase
        .from("groups")
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          type: form.type,
          facilitator_name: patient?.firstName || null,
          created_by: userId,
        })
        .select("*")
        .single<Group>();
      if (error) throw error;

      // add myself as member
      await supabase.from("group_members").insert({ group_id: g.id, user_id: userId, role: "patient" });

      // refresh groups list quickly
      setGroups((prev) =>
        [...prev, { 
          ...g, 
          members: [{ group_id: g.id, user_id: userId, role: "patient" as Role, joined_at: new Date().toISOString() }], 
          member_count: 1 
        }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setSelectedGroupId(g.id);
      setCreateOpen(false);
      setForm({ name: "", description: "", type: "support" });
    } catch (e) {
      console.warn("[group] create failed", e);
    } finally {
      setCreating(false);
    }
  }

  async function deleteGroup(gid: string) {
    if (!userId) return;
    const g = groups.find((x) => x.id === gid);
    if (!g) return;
    if (g.created_by !== userId) {
      alert("Only the creator can delete this group.");
      return;
    }
    try {
      await supabase.from("groups").delete().eq("id", gid);
      setGroups((prev) => prev.filter((x) => x.id !== gid));
      if (selectedGroupId === gid) setSelectedGroupId(groups.find((x) => x.id !== gid)?.id || null);
    } catch (e) {
      console.warn("[group] delete failed", e);
    }
  }

  // ---- Guards
  if (!isAuthenticated || !userId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-gray-600">Sign in to access Support Groups.</div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
      {/* Enhanced Groups List */}
      <Card className="lg:col-span-1 border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-blue-600 p-2 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Support Groups
                </CardTitle>
                <CardDescription className="text-sm">Join group conversations</CardDescription>
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
                placeholder="Search groups..."
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
                    {filterType === "all" ? "All Types" : filterType}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType("all")}>All Types</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("support")}>Support</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("therapy")}>Therapy</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("recovery")}>Recovery</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("social")}>Social</DropdownMenuItem>
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
        {/* Enhanced Create Group Form */}
        {createOpen && (
          <CardContent className="space-y-4 border-t pt-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="space-y-3">
              <div>
                <Label htmlFor="group-name" className="text-sm font-medium text-gray-700">Group Name</Label>
                <Input 
                  id="group-name"
                  placeholder="Enter group name..." 
                  value={form.name} 
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="group-description" className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea 
                  id="group-description"
                  placeholder="Describe your group..." 
                  value={form.description} 
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="group-type" className="text-sm font-medium text-gray-700">Group Type</Label>
                <select
                  id="group-type"
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as GroupType }))}
                >
                  <option value="support">🤝 Support Group</option>
                  <option value="therapy">🧠 Therapy Session</option>
                  <option value="recovery">💪 Recovery Journey</option>
                  <option value="social">🎉 Social Connection</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={createGroup} 
                disabled={creating || !form.name.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} 
                Create Group
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No groups found</p>
                <p className="text-sm text-gray-400">
                  {searchQuery ? "Try adjusting your search" : "Create your first group to get started"}
                </p>
                {!searchQuery && (
                  <Button 
                    size="sm" 
                    className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                )}
              </div>
            ) : (
              filteredGroups.map((group, index) => (
                <div key={group.id}>
                  <div
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 group ${
                      selectedGroupId === group.id 
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 border-r-4 border-blue-500 shadow-sm" 
                        : ""
                    }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {group.name.charAt(0).toUpperCase()}
                            </div>
                            {group.status === "active" && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate">{group.name}</h4>
                              {group.favorite && (
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              )}
                              {group.priority === "urgent" && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                              {group.is_private && (
                                <Lock className="h-3 w-3 text-gray-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${typeColor(group.type)} text-xs`} variant="secondary">
                                {group.type}
                              </Badge>
                              {group.status && group.status !== "active" && (
                                <Badge variant="outline" className="text-xs">
                                  {group.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              <span>{group.member_count}</span>
                              {group.max_members && (
                                <span className="text-gray-400">/ {group.max_members}</span>
                              )}
                            </div>
                            {group.last_activity && (
                              <div className="text-xs text-gray-400">
                                {formatTime(group.last_activity)}
                              </div>
                            )}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setShowGroupInfo(true)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Star className="h-4 w-4 mr-2" />
                                Add to Favorites
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {group.created_by === userId && (
                                <>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Group
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => deleteGroup(group.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Group
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {group.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{group.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Facilitator: {group.facilitator_name || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {group.member_count > 0 ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {index < filteredGroups.length - 1 && <Separator className="mx-4" />}
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2">
        {selectedGroup ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedGroup.name}</h3>
                  <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={typeColor(selectedGroup.type)} variant="secondary">
                      {selectedGroup.type}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {selectedGroup.member_count} members • Facilitated by {selectedGroup.facilitator_name || "—"}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px] p-4">
                <div className="space-y-4">
                  {selectedMessages.map((message) => (
                    <div key={message.id} className="space-y-2 group">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src={"/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {message.sender_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.sender_name}</span>
                            <Badge className={roleColor(message.sender_role)} variant="outline">
                              {message.sender_role}
                            </Badge>
                            <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                            {message.supportive && <Heart className="h-3 w-3 text-red-500" />}
                            {/* Delete button - only show for patient's own messages */}
                            {message.sender_id === userId && (
                              <div className="relative ml-auto">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                  onClick={() => setShowDeleteMenu(showDeleteMenu === message.id ? null : message.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                {showDeleteMenu === message.id && (
                                  <div className="delete-menu absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-red-600 hover:bg-red-50"
                                      onClick={() => deleteMessage(message.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 leading-relaxed">{message.content}</p>
                          {message.reactions?.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              {message.reactions.map((r, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs bg-transparent"
                                  onClick={() => addReaction(message.id, r.emoji)}
                                >
                                  {r.emoji} {r.count}
                                </Button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            {["❤️", "👏", "💪", "🙏"].map((e) => (
                              <Button
                                key={e}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => addReaction(message.id, e)}
                              >
                                {e}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedMessages.length === 0 && (
                    <div className="text-sm text-gray-500 px-2">No messages yet. Say hello 👋</div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Share your thoughts with the group..."
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Be kind and respectful. This is a supportive space.</p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a group to join the conversation</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Members */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>{selectedGroup ? `${selectedGroup.member_count} members` : "Select a group"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {selectedGroup ? (
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {selectedGroup.members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={"/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {(m.name || "U")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{m.name || "Member"}</p>
                      <div className="flex items-center gap-1">
                        <Badge className={roleColor(m.role)} variant="outline">
                          {m.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}


