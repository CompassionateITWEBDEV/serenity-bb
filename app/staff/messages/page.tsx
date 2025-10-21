"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, Search, Settings as SettingsIcon,
  Pin, PinOff, Archive, ArchiveRestore, CheckCheck, ArrowLeft, ChevronDown,
  MessageSquare, Users, Bell, Filter, MoreVertical, Star, StarOff,
  Clock, CheckCircle2, AlertCircle, User, Mail, Phone, Calendar,
  Send, Paperclip, Smile, MoreHorizontal, RefreshCw, X
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import IncomingCallNotification from "@/components/call/IncomingCallNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  email: string | null;
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

function formatTime(iso: string) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch {
    return "";
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "online": return "bg-green-500";
    case "away": return "bg-yellow-500";
    case "busy": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

function readSettings(): UiSettings {
  if (typeof window === "undefined") {
    return {
      theme: "light",
      density: "comfortable",
      bubbleRadius: "rounded-xl",
      enterToSend: true,
      sound: true,
    };
  }
  const raw = localStorage.getItem("staff:chat:settings");
  return raw
    ? (JSON.parse(raw) as UiSettings)
    : {
        theme: "light",
        density: "comfortable",
        bubbleRadius: "rounded-xl",
        enterToSend: true,
        sound: true,
      };
}

function persistSettings(s: UiSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("staff:chat:settings", JSON.stringify(s));
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

    const apply = (mode: "dark" | "light") => {
      if (mode === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    };

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mql.matches ? "dark" : "light");
      const cb = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mql.addEventListener?.("change", cb);
      return () => mql.removeEventListener?.("change", cb);
    }

    apply(theme);
    return;
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
  const [settings, setSettings] = useState<UiSettings>(() => readSettings());
  useEffect(() => {
    persistSettings(settings);
  }, [settings]);
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
    if (!v) return patients;
    return patients.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(v) ||
        (p.email ?? "").toLowerCase().includes(v)
    );
  }, [patients, pSearch]);

  /* URL helper */
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
        await markReadHelper(selectedId, "nurse");
        setUnreadMap((m) => ({ ...m, [selectedId]: 0 }));
        syncUrlOpen(selectedId);
      } catch {
        notify("Failed to mark as read", "err");
      }
    })();
  }, [selectedId, meId, notify, syncUrlOpen]);

  /* Merge updated row safely */
  const mergeRowFromDb = useCallback(
    <
      T extends {
        id: string;
        pinned?: boolean | null;
        archived_at?: string | null;
        last_message_at?: string | null;
        created_at?: string | null;
      }
    >(
      row: T
    ) => {
      setConvs((cur) =>
        cur.map((c) =>
          c.id === row.id
            ? {
                ...c,
                pinned: row.pinned ?? c.pinned,
                archived_at: (row.archived_at as any) ?? c.archived_at,
                updated_at: (row.last_message_at ?? row.created_at ?? c.updated_at) as string,
              }
            : c
        )
      );
    },
    []
  );

  /* Row actions (optimistic with DB truth merge) */
  const togglePin = useCallback(
    async (id: string, next: boolean) => {
      setConvs((cur) => cur.map((c) => (c.id === id ? { ...c, pinned: next } : c))); // optimistic
      const { data, error } = await supabase
        .from("conversations")
        .update({ pinned: next })
        .eq("id", id)
        .select("id, pinned, archived_at, last_message_at, created_at")
        .single();

      if (error || !data) {
        notify("Failed to update pin", "err");
        setConvs((cur) => cur.map((c) => (c.id === id ? { ...c, pinned: !next } : c))); // rollback
        return;
      }
      mergeRowFromDb(data);
      notify(next ? "Pinned" : "Unpinned");
    },
    [mergeRowFromDb, notify]
  );

  const toggleArchive = useCallback(
    async (id: string, next: boolean) => {
      const value = next ? new Date().toISOString() : null;

      setConvs((cur) =>
        cur.map((c) => (c.id === id ? { ...c, archived_at: value as any } : c))
      ); // optimistic

      const { data, error } = await supabase
        .from("conversations")
        .update({ archived_at: value as any })
        .eq("id", id)
        .select("id, pinned, archived_at, last_message_at, created_at")
        .single();

      if (error || !data) {
        notify("Failed to update archive", "err");
        setConvs((cur) =>
          cur.map((c) => (c.id === id ? { ...c, archived_at: next ? null : (value as any) } : c))
        ); // rollback
        return;
      }
      mergeRowFromDb(data);
      if (next && selectedId === id) setSelectedId(null);
      notify(next ? "Archived" : "Unarchived");
    },
    [mergeRowFromDb, notify, selectedId]
  );

  const markRead = useCallback(
    async (id: string) => {
      try {
        await markReadHelper(id, "nurse");
        setUnreadMap((m) => ({ ...m, [id]: 0 }));
        notify("Marked as read");
      } catch {
        notify("Failed to mark as read", "err");
      }
    },
    [notify]
  );

  const bulkArchive = useCallback(async () => {
    if (!meId) return;
    const { data, error } = await supabase
      .from("conversations")
      .update({ archived_at: new Date().toISOString() as any })
      .eq("provider_id", meId)
      .is("archived_at", null)
      .select("id, archived_at, pinned, last_message_at, created_at");

    if (error) {
      notify("Failed to archive all", "err");
      return;
    }
    (data ?? []).forEach((row) => mergeRowFromDb(row));
    if (selectedId && (data ?? []).some((d) => d.id === selectedId)) setSelectedId(null);
    setTab("archived");
    notify("Archived all");
  }, [meId, mergeRowFromDb, notify, selectedId]);

  const bulkUnarchive = useCallback(async () => {
    if (!meId) return;
    const { data, error } = await supabase
      .from("conversations")
      .update({ archived_at: null as any })
      .eq("provider_id", meId)
      .not("archived_at", "is", null)
      .select("id, archived_at, pinned, last_message_at, created_at");

    if (error) {
      notify("Failed to unarchive all", "err");
      return;
    }
    (data ?? []).forEach((row) => mergeRowFromDb(row));
    setTab("all");
    notify("Unarchived all");
  }, [meId, mergeRowFromDb, notify]);

  /* Back */
  const handleBack = useCallback(() => router.push("/staff/dashboard"), [router]);

  /* Counts */
  const counts = useMemo(() => {
    const archived = convs.filter((c) => !!c.archived_at).length;
    const pinned = convs.filter((c) => !!c.pinned && !c.archived_at).length;
    const newCount = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    return { archived, pinned, newCount };
  }, [convs, unreadMap]);

  /* Filtering & sorting */
  const filteredConvs = useMemo(() => {
    let list = convs.slice();
    list = tab === "archived" ? list.filter((c) => !!c.archived_at) : list.filter((c) => !c.archived_at);
    if (tab === "new") list = list.filter((c) => (unreadMap[c.id] ?? 0) > 0);
    if (tab === "pinned") list = list.filter((c) => !!c.pinned);

    if (qDebounced) {
      list = list.filter(
        (c) =>
          (c.patient_name ?? c.patient_email ?? "patient").toLowerCase().includes(qDebounced) ||
          (c.last_message ?? "").toLowerCase().includes(qDebounced)
      );
    }
    list.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return a.updated_at < b.updated_at ? 1 : -1;
    });
    return list;
  }, [convs, tab, qDebounced, unreadMap]);

  /* Start new message */
  const startNewMessage = useCallback(
    async (patient: PatientAssigned) => {
      if (!meId) return;
      const { id: convId } = await ensureConversation(patient.user_id, {
        id: meId,
        name: meName,
        role: meRole,
      });
      setConvs(await listConversationsForProvider(meId));
      openConversation(convId);
      setModalOpen(false);
      notify("Conversation started");
    },
    [meId, meName, meRole, openConversation, notify]
  );

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* notifier */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={clsx(
            "fixed right-6 top-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
            notice.tone === "err" && "bg-red-500/90 text-white",
            notice.tone === "warn" && "bg-amber-500/90 text-black",
            (!notice.tone || notice.tone === "ok") && "bg-emerald-500/90 text-white"
          )}
        >
          {notice.text}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Messages
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Communicate with your patients
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Users className="h-4 w-4" />
                  <span>{convs.length} conversations</span>
                </div>
                {counts.newCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Bell className="h-4 w-4" />
                    <span>{counts.newCount} unread</span>
                  </div>
                )}
              </div>

              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" aria-label="Open settings">
                    <SettingsIcon className="h-4 w-4" /> Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Chat Settings</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium mb-3">Theme</p>
                      <div className="flex gap-2">
                        {(["light", "dark", "system"] as const).map((v) => (
                          <Button
                            key={v}
                            variant={settings.theme === v ? "default" : "outline"}
                            onClick={() => setSettings((s) => ({ ...s, theme: v }))}
                            className="flex-1"
                            aria-pressed={settings.theme === v}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-3">Density</p>
                      <div className="flex gap-2">
                        {(["comfortable", "compact"] as const).map((v) => (
                          <Button
                            key={v}
                            variant={settings.density === v ? "default" : "outline"}
                            onClick={() => setSettings((s) => ({ ...s, density: v }))}
                            className="flex-1"
                            aria-pressed={settings.density === v}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-3">Bubble Style</p>
                      <div className="flex gap-2">
                        {(["rounded-lg", "rounded-xl", "rounded-2xl"] as const).map((v) => (
                          <Button
                            key={v}
                            variant={settings.bubbleRadius === v ? "default" : "outline"}
                            onClick={() => setSettings((s) => ({ ...s, bubbleRadius: v }))}
                            className="flex-1"
                            aria-pressed={settings.bubbleRadius === v}
                          >
                            {v.replace("rounded-", "")}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Enter to send</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Press Enter to send messages</p>
                      </div>
                      <Button
                        variant={settings.enterToSend ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setSettings((s) => ({ ...s, enterToSend: !s.enterToSend }))
                        }
                      >
                        {settings.enterToSend ? "On" : "Off"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Sound notifications</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Play sounds for new messages</p>
                      </div>
                      <Button
                        variant={settings.sound ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
                      >
                        {settings.sound ? "On" : "Off"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                onClick={() => setModalOpen(true)}
                aria-label="Start new message"
              >
                <Plus className="h-4 w-4" /> New Message
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="More options">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    await supabase.auth.signOut();
                    router.refresh();
                  }}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6">
        <div className="grid h-[calc(100vh-200px)] grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Conversations Sidebar */}
          <Card className="lg:col-span-1 overflow-hidden shadow-lg border-0 bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Conversations
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="h-8 w-8 p-0"
                    aria-label="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filter Tabs */}
              <Tabs value={tab} onValueChange={(value) => setTab(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800">
                  <TabsTrigger value="all" className="text-xs">
                    All
                    {convs.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                        {convs.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="new" className="text-xs">
                    New
                    {counts.newCount > 0 && (
                      <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs bg-amber-500">
                        {counts.newCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pinned" className="text-xs">
                    Pinned
                    {counts.pinned > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                        {counts.pinned}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="text-xs">
                    Archived
                    {counts.archived > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                        {counts.archived}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  ref={searchRef}
                  placeholder="Search conversations… (Press / to focus)"
                  aria-label="Search conversations"
                  className="pl-10 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <Filter className="h-3 w-3" />
                      Actions
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={bulkArchive}>
                      <Archive className="mr-2 h-4 w-4" /> Archive All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={bulkUnarchive}>
                      <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div ref={listRef} className={clsx(
                "overflow-y-auto",
                settings.density === "compact" ? "max-h-[calc(100vh-300px)]" : "max-h-[calc(100vh-320px)]"
              )}>
                {loading && (
                  <div className="space-y-3 p-4" aria-live="polite">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse rounded-xl border p-4 bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filteredConvs.length === 0 && (
                  <div className="p-8 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {tab === "new" ? "No new messages" : 
                       tab === "pinned" ? "No pinned conversations" :
                       tab === "archived" ? "No archived conversations" :
                       "No conversations found"}
                    </p>
                  </div>
                )}

                <div className="space-y-2 p-3">
                  {filteredConvs.map((c) => {
                    const active = selectedId === c.id;
                    const un = unreadMap[c.id] ?? 0;
                    return (
                      <div
                        key={c.id}
                        onClick={() => openConversation(c.id)}
                        className={clsx(
                          "group relative flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all cursor-pointer",
                          active
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 shadow-md"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                        aria-current={active ? "true" : "false"}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openConversation(c.id);
                          }
                        }}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-800">
                            <AvatarImage src={c.patient_avatar ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              {initials(c.patient_name || c.patient_email || "Patient")}
                            </AvatarFallback>
                          </Avatar>
                          {un > 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{un}</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {c.patient_name ?? c.patient_email ?? "Patient"}
                            </p>
                            <div className="flex items-center gap-2">
                              {c.pinned && !c.archived_at && (
                                <Star className="h-4 w-4 text-amber-500 fill-current" aria-hidden="true" />
                              )}
                              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                {formatTime(c.updated_at)}
                              </span>
                            </div>
                          </div>
                          <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                            {c.last_message ?? "No messages yet"}
                          </p>
                        </div>

                        {/* Row actions */}
                        <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Conversation actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(c.id, !c.pinned);
                                }}
                              >
                                {c.pinned ? (
                                  <>
                                    <StarOff className="mr-2 h-4 w-4" /> Unpin
                                  </>
                                ) : (
                                  <>
                                    <Star className="mr-2 h-4 w-4" /> Pin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markRead(c.id);
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Read
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleArchive(c.id, !c.archived_at);
                                }}
                              >
                                {c.archived_at ? (
                                  <>
                                    <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                                  </>
                                ) : (
                                  <>
                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {!selectedConv ? (
              <Card className="h-full shadow-lg border-0 bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
                <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center mb-6">
                    <MessageSquare className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                    Choose a conversation from the sidebar to start messaging with your patients
                  </p>
                  <Button
                    onClick={() => setModalOpen(true)}
                    className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4" />
                    Start New Conversation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full rounded-xl overflow-hidden shadow-lg border-0 bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
                <ChatBox
                  mode="staff"
                  patientId={selectedConv.patient_id}
                  providerId={meId!}
                  providerName={meName}
                  providerRole={meRole}
                  settings={settings}
                  conversationId={selectedConv.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Start new message"
        >
          <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">New Message</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Start a conversation with a patient</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search patients by name or email…"
                  className="pl-10 bg-slate-50 dark:bg-slate-800"
                  value={pSearch}
                  onChange={(e) => setPSearch(e.target.value)}
                  autoFocus
                  aria-label="Search patients to start a message"
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredPatients.length === 0 && (
                  <div className="p-8 text-center">
                    <User className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {pSearch ? "No patients found matching your search" : "No patients available"}
                    </p>
                  </div>
                )}
                {filteredPatients.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-4 transition-colors"
                    onClick={() => startNewMessage(p)}
                    aria-label={`Message ${p.full_name ?? p.email ?? "patient"}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={p.avatar ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {initials(p.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {p.full_name ?? "Patient"}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {p.email ?? ""}
                      </div>
                    </div>
                    <div className="text-slate-400">
                      <Send className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <IncomingCallNotification />
    </div>
  );
}