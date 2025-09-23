"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Send, Settings, UserPlus, Heart, Trash2, Plus, Loader2 } from "lucide-react";
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
  const { isAuthenticated, user, patient } = useAuth();
  const userId = (patient?.user_id || patient?.id || user?.id) as string | undefined;

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

  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ---- helpers
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
  function formatTime(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 36e5;
    return diffH < 24 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
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
      sender_name: patient?.full_name || patient?.first_name || "You",
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

  async function addReaction(messageId: string, emoji: string) {
    if (!selectedGroupId || !userId) return;
    try {
      const msg = selectedMessages.find((m) => m.id === messageId);
      if (!msg) return;
      const reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
      const idx = reactions.findIndex((r) => r.emoji === emoji);
      if (idx >= 0) {
        const r = reactions[idx];
        if (!r.users.includes(userId)) {
          reactions[idx] = { ...r, count: r.count + 1, users: [...r.users, userId] };
        }
      } else {
        reactions.push({ emoji, count: 1, users: [userId] });
      }
      const { data, error } = await supabase
        .from("group_messages")
        .update({ reactions })
        .eq("id", messageId)
        .select("*")
        .single<Message>();
      if (error) throw error;
      setMessages((prev) => ({
        ...prev,
        [selectedGroupId]: (prev[selectedGroupId] || []).map((m) => (m.id === messageId ? data : m)),
      }));
    } catch (e) {
      console.warn("[reaction] update failed", e);
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
          facilitator_name: patient?.full_name || null,
          created_by: userId,
        })
        .select("*")
        .single<Group>();
      if (error) throw error;

      // add myself as member
      await supabase.from("group_members").insert({ group_id: g.id, user_id: userId, role: "patient" });

      // refresh groups list quickly
      setGroups((prev) =>
        [...prev, { ...g, members: [{ group_id: g.id, user_id: userId, role: "patient", joined_at: new Date().toISOString() }], member_count: 1 }].sort((a, b) =>
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
      {/* Groups List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Support Groups
              </CardTitle>
              <CardDescription>Join group conversations</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateOpen((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
        </CardHeader>
        {createOpen && (
          <CardContent className="space-y-3 border-t pt-3">
            <Input placeholder="Group name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <select
                className="w-full p-2 border rounded-md"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as GroupType }))}
              >
                <option value="support">Support</option>
                <option value="therapy">Therapy</option>
                <option value="recovery">Recovery</option>
                <option value="social">Social</option>
              </select>
              <Button onClick={createGroup} disabled={creating || !form.name.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
              </Button>
            </div>
          </CardContent>
        )}
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {loadingGroups ? (
              <div className="p-4 text-sm text-gray-500">Loading groups…</div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No groups yet. Create one!</div>
            ) : (
              groups.map((group, index) => (
                <div key={group.id}>
                  <div
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedGroupId === group.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                    }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <Badge className={typeColor(group.type)} variant="secondary">
                          {group.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{group.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group.member_count} members
                        </span>
                        <span>Facilitator: {group.facilitator_name || "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-4 pb-2">
                    {group.created_by === userId && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => deleteGroup(group.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {index < groups.length - 1 && <Separator />}
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
                    <div key={message.id} className="space-y-2">
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
