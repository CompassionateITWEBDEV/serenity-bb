"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageCircle, Search, Send, EllipsisVertical, Pencil, Trash2, Smile, Settings as SettingsIcon } from "lucide-react";
import Swal from "sweetalert2";

type ProviderRole = "doctor" | "nurse" | "counselor";
type AppRole = "staff" | "patient";

type Conversation = {
  id: string;
  patient_id: string;
  provider_id: string;
  provider_name: string | null;
  provider_role: ProviderRole | null;
  provider_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  patient?:
    | { user_id: string; full_name: string | null; email: string | null; avatar: string | null }
    | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string | null;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | ProviderRole;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

type StaffRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
  role: string | null;
  avatar_url: string | null;
  active: boolean | null;
};

type UiSettings = {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  bubbleRadius: "rounded-lg" | "rounded-xl" | "rounded-2xl";
};

function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  return s.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function toProviderRole(role?: string | null): ProviderRole {
  const r = (role ?? "").toLowerCase();
  if (r.includes("doc")) return "doctor";
  if (r.includes("nurse")) return "nurse";
  if (r.includes("counsel")) return "counselor";
  return "nurse";
}
function upsertConversation(list: Conversation[], row: Conversation): Conversation[] {
  const i = list.findIndex((c) => c.id === row.id);
  if (i === -1) return [row, ...list];
  const next = list.slice(); next[i] = { ...next[i], ...row }; return next;
}

export default function MessagesPage() {
  const [me, setMe] = useState<
    | { id: string; appRole: AppRole; name: string; providerRole?: ProviderRole }
    | null
  >(null);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UiSettings>(() => {
    const raw = localStorage.getItem("chat:settings");
    return raw
      ? (JSON.parse(raw) as UiSettings)
      : { theme: "light", density: "comfortable", bubbleRadius: "rounded-xl" };
  });

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("chat:settings", JSON.stringify(settings));
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (settings.theme === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  // Role detection
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) {
        await Swal.fire("Access error", "Please sign in.", "error");
        return;
      }
      const { data: s } = await supabase
        .from("staff")
        .select("user_id, first_name, last_name, role, email")
        .eq("user_id", uid)
        .maybeSingle();

      if (s?.user_id) {
        setMe({
          id: uid,
          appRole: "staff",
          providerRole: toProviderRole((s as any).role),
          name: [s.first_name, s.last_name].filter(Boolean).join(" ") || au.user?.email || "Me",
        });
        return;
      }

      const { data: p } = await supabase
        .from("patients")
        .select("user_id, first_name, last_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      if (p?.user_id) {
        setMe({
          id: uid,
          appRole: "patient",
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || au.user?.email || "Me",
        });
        return;
      }

      await Swal.fire("Access error", "No profile found.", "error");
    })();
  }, []);

  // Conversations (per role)
  useEffect(() => {
    if (!me) return;
    (async () => {
      if (me.appRole === "staff") {
        const { data, error } = await supabase
          .from("conversations")
          .select(
            `id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at,
             patient:patients!conversations_patient_id_fkey(user_id, full_name, email, avatar)`
          )
          .eq("provider_id", me.id)
          .order("last_message_at", { ascending: false, nullsFirst: false });
        if (error) return Swal.fire("Load error", error.message, "error");
        setConvs((data as any) || []);
      } else {
        const { data, error } = await supabase
          .from("conversations")
          .select(
            `id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at`
          )
          .eq("patient_id", me.id)
          .order("last_message_at", { ascending: false, nullsFirst: false });
        if (error) return Swal.fire("Load error", error.message, "error");
        setConvs((data as any) || []);
      }
    })();
  }, [me]);

  // Staff directory for patients
  useEffect(() => {
    if (!me || me.appRole !== "patient") return;
    (async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("user_id, first_name, last_name, email, title, department, role, avatar_url, active")
        .eq("active", true)
        .order("first_name", { ascending: true });
      if (error) return Swal.fire("Load error", error.message, "error");
      setStaffDir((data as StaffRow[]) || []);
    })();
  }, [me]);

  // Realtime conv list
  useEffect(() => {
    if (!me) return;
    const filter = me.appRole === "staff" ? `provider_id=eq.${me.id}` : `patient_id=eq.${me.id}`;
    const ch = supabase
      .channel(`convs_${me.appRole}_${me.id}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "conversations", event: "*", filter },
        async () => {
          if (me.appRole === "staff") {
            const { data } = await supabase
              .from("conversations")
              .select(
                `id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at,
                 patient:patients!conversations_patient_id_fkey(user_id, full_name, email, avatar)`
              )
              .eq("provider_id", me.id)
              .order("last_message_at", { ascending: false });
            setConvs((data as any) || []);
          } else {
            const { data } = await supabase
              .from("conversations")
              .select(
                `id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at`
              )
              .eq("patient_id", me.id)
              .order("last_message_at", { ascending: false });
            setConvs((data as any) || []);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  // Thread + realtime
  useEffect(() => {
    if (!selectedId || !me) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) return Swal.fire("Load error", error.message, "error");
      if (alive) {
        setMsgs((data as MessageRow[]) || []);
        requestAnimationFrame(() =>
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
        );
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "*", filter: `conversation_id=eq.${selectedId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setMsgs((prev) => [...prev, payload.new as MessageRow]);
            requestAnimationFrame(() =>
              listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" })
            );
          } else {
            const { data } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", selectedId)
              .order("created_at", { ascending: true });
            setMsgs((data as MessageRow[]) || []);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); alive = false; };
  }, [selectedId, me]);

  // Start/open conversation (patient clicks staff)
  const startChatWith = useCallback(async (staff: StaffRow) => {
    if (!me || me.appRole !== "patient") return;
    const { data: convId, error } = await supabase.rpc("ensure_conversation", {
      p_patient: me.id,
      p_provider: staff.user_id,
    });
    if (error || !convId) return Swal.fire("Could not start chat", error?.message || "Unknown error", "error");
    const id = convId as string;
    setSelectedId(id);

    const { data: convRow } = await supabase
      .from("conversations")
      .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
      .eq("id", id)
      .single();

    if (convRow) {
      const needsMeta = !convRow.provider_name || !convRow.provider_role;
      if (needsMeta) {
        const provider_name = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email || "Staff";
        const provider_role = toProviderRole(staff.role ?? "");
        const provider_avatar = staff.avatar_url ?? null;
        await supabase.from("conversations").update({ provider_name, provider_role, provider_avatar }).eq("id", id);
        convRow.provider_name = provider_name;
        convRow.provider_role = provider_role;
        convRow.provider_avatar = provider_avatar;
      }
      setConvs((prev) => upsertConversation(prev, convRow as unknown as Conversation));
    }
  }, [me]);

  // Send message
  async function send() {
    if (!me || !selectedId || !compose.trim()) return;

    let convo = convs.find((c) => c.id === selectedId);
    if (!convo) {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
        .eq("id", selectedId)
        .maybeSingle();
      if (error || !data) return Swal.fire("Send failed", error?.message || "Conversation not found", "error");
      convo = data as Conversation;
      setConvs((prev) => upsertConversation(prev, convo!));
    }

    const content = compose.trim();
    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: convo?.patient_id ?? null,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: me.appRole === "patient" ? "patient" : (me.providerRole as ProviderRole),
      content,
      created_at: new Date().toISOString(),
      read: false,
      urgent: false,
    };

    setMsgs((m) => [...m, optimistic]);
    setCompose("");

    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: convo?.patient_id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: me.appRole === "patient" ? "patient" : (me.providerRole as ProviderRole),
      content,
      read: false,
      urgent: false,
    });

    if (insErr) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      return Swal.fire("Send failed", insErr.message, "error");
    }

    await supabase
      .from("conversations")
      .update({ last_message: content, last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
  }

  // Edit message (own only)
  async function editMessage(m: MessageRow) {
    setEditingId(m.id);
    setEditingText(m.content);
  }
  async function saveEdit(id: string) {
    const old = msgs.find((x) => x.id === id);
    if (!old) return;
    const next = editingText.trim();
    if (!next) return;
    setEditingId(null);

    const prevMsgs = msgs.slice();
    setMsgs((arr) => arr.map((x) => (x.id === id ? { ...x, content: next } : x)));

    const { error } = await supabase.from("messages").update({ content: next }).eq("id", id);
    if (error) {
      setMsgs(prevMsgs);
      await Swal.fire("Edit failed", error.message, "error");
    }
  }

  // Delete message (own only)
  async function deleteMessage(m: MessageRow) {
    const ok = await Swal.fire({ title: "Delete message?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
    if (!ok.isConfirmed) return;

    const prev = msgs.slice();
    setMsgs((arr) => arr.filter((x) => x.id !== m.id));

    const { error } = await supabase.from("messages").delete().eq("id", m.id);
    if (error) {
      // fallback: try soft delete via content change
      const { error: updErr } = await supabase.from("messages").update({ content: "[deleted]" }).eq("id", m.id);
      if (updErr) {
        setMsgs(prev);
        await Swal.fire("Delete failed", error.message, "error");
      }
    }
  }

  // Emoji picker (small set)
  const addEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { setCompose((v) => v + emoji); return; }
    const start = el.selectionStart ?? compose.length;
    const end = el.selectionEnd ?? compose.length;
    const next = compose.slice(0, start) + emoji + compose.slice(end);
    setCompose(next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + emoji.length;
    }, 0);
  };

  const search = q.trim().toLowerCase();
  const convsSorted = useMemo(() => {
    const arr = convs.slice();
    arr.sort((a, b) => {
      const ta = a.last_message_at || a.created_at || "";
      const tb = b.last_message_at || b.created_at || "";
      return tb.localeCompare(ta);
    });
    return arr;
  }, [convs]);

  const filteredStaff = useMemo(() => {
    if (me?.appRole !== "patient") return [];
    if (!search) return staffDir;
    return staffDir.filter((s) => {
      const name = [s.first_name, s.last_name].filter(Boolean).join(" ");
      return (
        name.toLowerCase().includes(search) ||
        (s.email ?? "").toLowerCase().includes(search) ||
        (s.department ?? "").toLowerCase().includes(search) ||
        (s.title ?? "").toLowerCase().includes(search)
      );
    });
  }, [staffDir, search, me?.appRole]);

  const bubbleBase =
    settings.bubbleRadius +
    " px-4 py-2 " +
    (settings.density === "compact" ? "text-sm" : "text-[15px]");

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            {me?.appRole === "staff" ? "Chat with your patients" : "Chat with your care team"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
        </Button>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={me?.appRole === "staff" ? "Search patients…" : "Search staff…"}
                className="pl-10"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y dark:divide-gray-800">
              {/* Recent conversations */}
              {convsSorted
                .filter((c) => {
                  const other =
                    me?.appRole === "staff"
                      ? c.patient?.full_name ?? c.patient?.email ?? "Patient"
                      : c.provider_name ?? "Staff";
                  return search ? (other ?? "").toLowerCase().includes(search) : true;
                })
                .map((c) => {
                  const active = selectedId === c.id;
                  const other =
                    me?.appRole === "staff"
                      ? c.patient?.full_name ?? c.patient?.email ?? "Patient"
                      : c.provider_name ?? "Staff";
                  const avatarSrc =
                    me?.appRole === "staff" ? c.patient?.avatar ?? undefined : c.provider_avatar ?? undefined;

                  return (
                    <button
                      key={`conv-${c.id}`}
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 border-l-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 ${
                        active ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" : "border-transparent"
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback>{initials(other)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium text-gray-900 dark:text-gray-100">{other}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(c.last_message_at ?? c.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{c.provider_role ?? "staff"}</Badge>
                          <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}

              {/* Staff directory (patient only) */}
              {me?.appRole === "patient" &&
                filteredStaff.map((s) => {
                  const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Staff";
                  return (
                    <button
                      key={`staff-${s.user_id}`}
                      onClick={() => startChatWith(s)}
                      className="flex w-full items-center gap-3 border-l-4 border-transparent p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                      title="Start chat"
                    >
                      <Avatar>
                        <AvatarImage src={s.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium text-gray-900 dark:text-gray-100">{name}</p>
                          <span className="text-xs text-gray-500">{s.title ?? s.department ?? ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{toProviderRole(s.role ?? "")}</Badge>
                          <p className="truncate text-xs text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}

              {convsSorted.length === 0 && me?.appRole === "staff" && (
                <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
              )}
              {me?.appRole === "patient" && filteredStaff.length === 0 && (
                <div className="p-6 text-sm text-gray-500">No staff found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thread panel */}
        <Card className="flex flex-col lg:col-span-2">
          {!selectedId ? (
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">Select a conversation</h3>
              </div>
            </CardContent>
          ) : (
            <>
              <CardContent ref={listRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {msgs.map((m) => {
                    const own = m.sender_id === me?.id;
                    const bubble = own
                      ? `bg-cyan-500 text-white ${bubbleBase}`
                      : `bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${bubbleBase}`;
                    return (
                      <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-full sm:max-w-lg">
                          <div className={`group relative ${bubble}`}>
                            {editingId === m.id ? (
                              <div className="flex items-end gap-2">
                                <Input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="text-black"
                                />
                                <Button size="sm" onClick={() => saveEdit(m.id)}>Save</Button>
                                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                <div className={`mt-1 text-[11px] ${own ? "text-cyan-100" : "text-gray-500"}`}>
                                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                {own && (
                                  <div className="absolute -top-2 -right-2 opacity-0 transition group-hover:opacity-100">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="secondary" className="h-6 w-6">
                                          <EllipsisVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => editMessage(m)}>
                                          <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteMessage(m)}>
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {msgs.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
                </div>
              </CardContent>

              {/* Composer */}
              <div className="border-t p-3 sm:p-4">
                <div className="flex items-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="secondary" className="shrink-0">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Pick an emoji</DialogTitle>
                      </DialogHeader>
                      <EmojiGrid onPick={addEmoji} />
                    </DialogContent>
                  </Dialog>

                  <Textarea
                    ref={textareaRef}
                    placeholder="Type your message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    className={`min-h-[44px] max-h-[140px] flex-1 ${settings.density === "compact" ? "text-sm" : ""}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button onClick={send} disabled={!compose.trim()} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <div className="mt-2 flex gap-2">
                {(["light", "dark", "system"] as const).map((v) => (
                  <Button key={v} variant={settings.theme === v ? "default" : "outline"} onClick={() => setSettings((s) => ({ ...s, theme: v }))}>
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Density</p>
              <div className="mt-2 flex gap-2">
                {(["comfortable", "compact"] as const).map((v) => (
                  <Button key={v} variant={settings.density === v ? "default" : "outline"} onClick={() => setSettings((s) => ({ ...s, density: v }))}>
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Bubble roundness</p>
              <div className="mt-2 flex gap-2">
                {(["rounded-lg", "rounded-xl", "rounded-2xl"] as const).map((v) => (
                  <Button key={v} variant={settings.bubbleRadius === v ? "default" : "outline"} onClick={() => setSettings((s) => ({ ...s, bubbleRadius: v }))}>
                    {v.replace("rounded-", "")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Emoji grid with a small curated set – no extra deps */
function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  const groups: Record<string, string[]> = {
    "😀 Smileys": ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🥳", "😇", "🙂", "🙃", "😌"],
    "👍 Gestures": ["👍", "👎", "👏", "🙏", "🤝", "👌", "✌️", "🤞", "👋", "💪"],
    "❤️ Hearts": ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💕", "💖"],
    "🔥 Misc": ["🔥", "🎉", "✨", "⭐", "🌟", "🧠", "💡", "📌", "✅", "❗"],
  };
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([label, list]) => (
        <div key={label}>
          <p className="mb-2 text-xs font-medium text-gray-500">{label}</p>
          <div className="grid grid-cols-10 gap-2">
            {list.map((e) => (
              <button
                key={e}
                onClick={() => onPick(e)}
                className="rounded-md border p-2 text-xl hover:bg-gray-50 dark:hover:bg-gray-900"
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
