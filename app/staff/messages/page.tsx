"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, Search, Settings as SettingsIcon,
  Pin, PinOff, Archive, ArchiveRestore, CheckCheck, ArrowLeft, ChevronDown, MessageSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import IncomingCallNotification from "@/components/call/IncomingCallNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import ChatBox from "@/components/chat/ChatBox";
import type { ProviderRole } from "@/lib/chat";
import {
  listConversationsForProvider,
  ensureConversation,
  markRead as markReadHelper,
} from "@/lib/chat";

/* ---------- Types ---------- */
type ConversationPreview = Awaited<
  ReturnType<typeof listConversationsForProvider>
>[number];

type PatientAssigned = {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar: string | null;
};

type UiSettings = {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  bubbleRadius: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend: boolean;
  sound: boolean;
};

type Notice = { id: number; text: string; tone?: "ok" | "warn" | "err" };

/* ---------- Utils ---------- */
const clsx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

function initials(s?: string | null) {
  const v = (s ?? "U").trim();
  return v ? v.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
}

function mapStaffRole(role?: string | null, dept?: string | null): ProviderRole {
  const r = (role ?? "").toLowerCase();
  const d = (dept ?? "").toLowerCase();
  if (r.includes("doc") || r.includes("physician") || d.includes("medical")) return "doctor";
  if (r.includes("counsel") || r.includes("therap") || d.includes("therapy")) return "counselor";
  return "nurse";
}

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* Keep system theme synced when settings.theme === "system" */
function useSystemThemeSync(theme: UiSettings["theme"]) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (theme === "system") {
        document.documentElement.classList.toggle("dark", media.matches);
      }
    };

    onMediaChange();
    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, [theme]);
}

/* ---------- Component ---------- */
export default function StaffMessagesPage() {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Notice */
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback((text: string, tone: Notice["tone"] = "ok") => {
    const id = Date.now();
    setNotice({ id, text, tone });
    setTimeout(() => setNotice((n) => (n?.id === id ? null : n)), 1800);
  }, []);

  /* Settings */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UiSettings>(() => ({
    theme: "light",
    density: "comfortable",
    bubbleRadius: "rounded-xl",
    enterToSend: true,
    sound: true,
  }));
  
  useSystemThemeSync(settings.theme);

  /* Me */
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState("Me");
  const [meRole, setMeRole] = useState<ProviderRole>("nurse");

  /* Conversations */
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<ConversationPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedConv = convs.find((c) => c.id === selectedId) ?? null;

  /* Unread count */
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  /* Filters */
  const [tab, setTab] = useState<"all" | "new" | "pinned" | "archived">("all");
  const [q, setQ] = useState("");
  const qDebounced = useDebounce(q.trim().toLowerCase(), 180);

  /* New message modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [patients, setPatients] = useState<PatientAssigned[]>([]);
  const filteredPatients = useMemo(() => {
    const v = pSearch.trim().toLowerCase();
    return patients.filter((p) =>
        (p.full_name ?? "").toLowerCase().includes(v) ||
        (p.email ?? "").toLowerCase().includes(v)
    );
  }, [patients, pSearch]);

  const filteredConvs = useMemo(() => {
    let list = convs;
    
    // Filter by tab
    if (tab === "new") list = list.filter((c) => (unreadMap[c.id] ?? 0) > 0);
    else if (tab === "pinned") list = list.filter((c) => c.pinned && !c.archived_at);
    else if (tab === "archived") list = list.filter((c) => !!c.archived_at);
    
    // Filter by search
    if (qDebounced) {
      list = list.filter((c) =>
        (c.patient_name ?? "").toLowerCase().includes(qDebounced) ||
        (c.patient_email ?? "").toLowerCase().includes(qDebounced) ||
        (c.last_message ?? "").toLowerCase().includes(qDebounced)
      );
    }
    
    return list;
  }, [convs, tab, qDebounced, unreadMap]);

  const counts = useMemo(() => {
    const newCount = convs.filter((c) => (unreadMap[c.id] ?? 0) > 0).length;
    const pinned = convs.filter((c) => c.pinned && !c.archived_at).length;
    const archived = convs.filter((c) => !!c.archived_at).length;
    return { newCount, pinned, archived };
  }, [convs, unreadMap]);

  /* URL sync */
  const syncUrlOpen = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("open", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const openConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setUnreadMap((m) => ({ ...m, [id]: 0 }));
      syncUrlOpen(id);
    },
    [syncUrlOpen]
  );

  /* Bootstrap */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) {
        router.replace("/staff/login?redirect=/staff/messages");
        return;
      }
      if (!mounted) return;

      setMeId(uid);
      setMeName((au.user?.user_metadata?.full_name as string) || au.user?.email || "Me");

      const staff = await supabase
        .from("staff")
        .select("role, department, first_name, last_name")
        .eq("user_id", uid)
        .maybeSingle();

      const role = staff.error ? null : ((staff.data?.role as string | null) ?? null);
      const dept = staff.error ? null : ((staff.data?.department as string | null) ?? null);
      setMeRole(mapStaffRole(role, dept));
      const first = (staff.data?.first_name ?? "").trim();
      const last = (staff.data?.last_name ?? "").trim();
      if (first || last) setMeName(`${first} ${last}`.trim());

      const list = await listConversationsForProvider(uid);
      if (!mounted) return;
      setConvs(list);
      setLoading(false);

      const u = await supabase
        .from("v_staff_dm_unread")
        .select("conversation_id, unread_from_patient")
        .eq("provider_id", uid);

      if (!u.error && u.data && mounted) {
        const map: Record<string, number> = {};
        for (const r of (u.data as any[]) ?? []) map[r.conversation_id] = Number(r.unread_from_patient) || 0;
        setUnreadMap(map);
      }

      if (typeof window !== "undefined") {
        const id = new URLSearchParams(window.location.search).get("open");
        if (id) setSelectedId(id);
      }

      const v = await supabase
        .from("v_staff_assigned_patients")
        .select("user_id, full_name, email, avatar")
        .eq("staff_id", uid);

      if (!v.error && v.data && mounted) setPatients(v.data as PatientAssigned[]);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* Keep selection valid across refreshes/filters */
  useEffect(() => {
    if (!selectedId || convs.some((c) => c.id === selectedId)) return;
    if (convs.length) openConversation(convs[0].id);
  }, [convs, selectedId, openConversation]);

  /* Realtime list + unread bumps (debounced) */
  useEffect(() => {
    if (!meId) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const debounce = (fn: () => void, ms = 90) => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(fn, ms);
    };

    const convCh = supabase
      .channel(`conv_${meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `provider_id=eq.${meId}` },
        () => debounce(async () => setConvs(await listConversationsForProvider(meId)))
      )
      .subscribe();

    const inboxCh = supabase
      .channel(`inbox_${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as {
            conversation_id: string;
            sender_role: string;
            content: string;
            created_at: string;
          };
          if (m.sender_role !== "patient") return;
          setConvs((cur) =>
            cur
              .map((c) =>
                c.id === m.conversation_id
                  ? { ...c, last_message: m.content, updated_at: m.created_at }
                  : c
              )
              .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
          );
          setUnreadMap((prev) =>
            selectedId === m.conversation_id
              ? prev
              : { ...prev, [m.conversation_id]: (prev[m.conversation_id] ?? 0) + 1 }
          );
        }
      )
      .subscribe();

    return () => {
      if (debounceId) clearTimeout(debounceId);
      supabase.removeChannel(convCh);
      supabase.removeChannel(inboxCh);
    };
  }, [meId, selectedId]);

  /* Clear unread on open (server + local) */
  useEffect(() => {
    if (!selectedId || !meId) return;
    (async () => {
      try {
        await markReadHelper(selectedId, meRole);
      } catch (err) {
        console.warn("Failed to mark read:", err);
      }
    })();
  }, [selectedId, meId]);

  /* Merge updated row safely */
  const mergeRowFromDb = useCallback((row: ConversationPreview) => {
    setConvs((cur) => {
      const idx = cur.findIndex((c) => c.id === row.id);
      if (idx < 0) return cur;
      const next = [...cur];
      next[idx] = row;
      return next;
    });
  }, []);

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ pinned })
        .eq("id", id);
      if (error) throw error;
      mergeRowFromDb({ ...convs.find((c) => c.id === id)!, pinned });
    } catch (err) {
        notify("Failed to update pin", "err");
    }
  }, [convs, mergeRowFromDb, notify]);

  const toggleArchive = useCallback(async (id: string, archived: boolean) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      mergeRowFromDb({ ...convs.find((c) => c.id === id)!, archived_at: archived ? new Date().toISOString() : null });
    } catch (err) {
        notify("Failed to update archive", "err");
    }
  }, [convs, mergeRowFromDb, notify]);

  const markRead = useCallback(async (id: string) => {
    if (!meId) return;
    try {
      await markReadHelper(id, meRole);
        setUnreadMap((m) => ({ ...m, [id]: 0 }));
    } catch (err) {
      notify("Failed to mark read", "err");
      }
  }, [meId, notify]);

  const bulkArchive = useCallback(async () => {
    if (!meId) return;
    try {
      const { error } = await supabase
      .from("conversations")
        .update({ archived_at: new Date().toISOString() })
      .eq("provider_id", meId)
        .is("archived_at", null);
      if (error) throw error;
      setConvs((cur) => cur.map((c) => ({ ...c, archived_at: new Date().toISOString() })));
      setTab("archived");
      notify("Archived all");
    } catch (err) {
      notify("Failed to archive all", "err");
    }
  }, [meId, notify]);

  const bulkUnarchive = useCallback(async () => {
    if (!meId) return;
    try {
      const { error } = await supabase
      .from("conversations")
        .update({ archived_at: null })
      .eq("provider_id", meId)
        .not("archived_at", "is", null);
      if (error) throw error;
      setConvs((cur) => cur.map((c) => ({ ...c, archived_at: null })));
      setTab("all");
      notify("Unarchived all");
    } catch (err) {
      notify("Failed to unarchive all", "err");
    }
  }, [meId, notify]);

  /* Back */
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  /* Keyboard UX */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.key === "f" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        setModalOpen(true);
      }
      if (e.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <IncomingCallNotification />
      
      {/* Notice */}
      {notice && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
          notice.tone === "err" ? "bg-red-100 text-red-800 border border-red-200" :
          notice.tone === "warn" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
          "bg-green-100 text-green-800 border border-green-200"
        }`}>
          {notice.text}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Messages</h1>
              <p className="text-sm text-slate-500">Patient communications</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="text-slate-600 hover:text-slate-800"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations..."
                className="pl-10 h-11 rounded-lg border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { key: "all", label: "All", count: convs.length },
                { key: "new", label: "New", count: counts.newCount },
                { key: "pinned", label: "Pinned", count: counts.pinned },
                { key: "archived", label: "Archived", count: counts.archived },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === t.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                  {t.count > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {t.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {tab === "archived" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkUnarchive}
                  className="flex-1 text-xs"
                >
                  <ArchiveRestore className="h-3 w-3 mr-1" />
                  Unarchive All
                </Button>
              </div>
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading conversations...
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No conversations found</p>
                  {qDebounced && (
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search
                    </p>
                  )}
                </div>
              ) : (
                filteredConvs.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      selectedId === conv.id
                        ? "border-cyan-300 bg-cyan-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.patient_avatar || undefined} />
                        <AvatarFallback className="bg-cyan-100 text-cyan-700">
                          {initials(conv.patient_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-slate-900 truncate">
                            {conv.patient_name || "Unknown Patient"}
                          </h3>
                          <div className="flex items-center gap-1">
                            {conv.pinned && (
                              <Pin className="h-3 w-3 text-amber-500" />
                            )}
                            {(unreadMap[conv.id] ?? 0) > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                {unreadMap[conv.id]}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 truncate mb-2">
                          {conv.last_message || "No messages yet"}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : ""}
                          </span>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(conv.id, !conv.pinned);
                                }}
                              >
                                {conv.pinned ? (
                                  <>
                                    <PinOff className="h-4 w-4 mr-2" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4 mr-2" />
                                    Pin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleArchive(conv.id, !conv.archived_at);
                                }}
                              >
                                {conv.archived_at ? (
                                  <>
                                    <ArchiveRestore className="h-4 w-4 mr-2" />
                                    Unarchive
                                  </>
                                ) : (
                                  <>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </>
                                )}
                              </DropdownMenuItem>
                              {(unreadMap[conv.id] ?? 0) > 0 && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markRead(conv.id);
                                  }}
                                >
                                  <CheckCheck className="h-4 w-4 mr-2" />
                                  Mark Read
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConv ? (
              <div className="h-full bg-white rounded-lg border border-slate-200 shadow-sm">
                <ChatBox
                  mode="staff"
                  patientId={selectedConv.patient_id}
                  providerId={meId!}
                  providerName={meName}
                  providerRole={meRole}
                  patientName={selectedConv.patient_name || "Unknown Patient"}
                  conversationId={selectedConv.id}
                />
              </div>
            ) : (
              <div className="h-full bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                placeholder="Search patients..."
                className="pl-10"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.user_id}
                  onClick={async () => {
                    try {
                      const conv = await ensureConversation(patient.user_id, {
                        id: meId!,
                        name: meName,
                        role: meRole
                      });
                      setModalOpen(false);
                      openConversation(conv.id);
                    } catch (err) {
                      notify("Failed to start conversation", "err");
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 cursor-pointer transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={patient.avatar || undefined} />
                    <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs">
                      {initials(patient.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {patient.full_name || "Unknown Patient"}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {patient.email}
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredPatients.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">No patients found</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map((theme) => (
                  <Button
                    key={theme}
                    variant={settings.theme === theme ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(s => ({ ...s, theme }))}
                    className="capitalize"
                  >
                    {theme}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Density</label>
              <div className="grid grid-cols-2 gap-2">
                {(["comfortable", "compact"] as const).map((density) => (
                  <Button
                    key={density}
                    variant={settings.density === density ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(s => ({ ...s, density }))}
                    className="capitalize"
                  >
                    {density}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Bubble Style</label>
              <div className="grid grid-cols-3 gap-2">
                {(["rounded-lg", "rounded-xl", "rounded-2xl"] as const).map((radius) => (
                  <Button
                    key={radius}
                    variant={settings.bubbleRadius === radius ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(s => ({ ...s, bubbleRadius: radius }))}
                  >
                    <div className={`w-4 h-4 bg-slate-200 ${radius}`} />
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Enter to Send</label>
                <Button
                  variant={settings.enterToSend ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(s => ({ ...s, enterToSend: !s.enterToSend }))}
                >
                  {settings.enterToSend ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Sound Notifications</label>
                <Button
                  variant={settings.sound ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(s => ({ ...s, sound: !s.sound }))}
                >
                  {settings.sound ? "On" : "Off"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}