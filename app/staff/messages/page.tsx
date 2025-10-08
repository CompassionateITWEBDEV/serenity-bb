"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, Search, Settings as SettingsIcon,
  Pin, PinOff, Archive, ArchiveRestore, CheckCheck, ArrowLeft,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
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
import { useToast } from "@/components/ui/use-toast"; // ← toast

import ChatBox from "@/components/chat/ChatBox";
import type { ProviderRole } from "@/lib/chat";
import {
  listConversationsForProvider,
  ensureConversation,
  markRead as markReadHelper,
} from "@/lib/chat";

type ConversationPreview = Awaited<ReturnType<typeof listConversationsForProvider>>[number];
type PatientAssigned = { user_id: string; full_name: string | null; email: string | null; avatar: string | null };

type UiSettings = {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  bubbleRadius: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend: boolean;
  sound: boolean;
};

function initials(s?: string | null) {
  const v = (s ?? "U").trim();
  return v ? v.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
}
function mapStaffRole(role?: string | null, dept?: string | null): ProviderRole {
  const r = (role ?? "").toLowerCase(), d = (dept ?? "").toLowerCase();
  if (r.includes("doc") || r.includes("physician") || d.includes("medical")) return "doctor";
  if (r.includes("counsel") || r.includes("therap") || d.includes("therapy")) return "counselor";
  return "nurse";
}
function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function StaffMessagesPage() {
  const router = useRouter();
  const { toast } = useToast(); // ← toast hook
  const listRef = useRef<HTMLDivElement>(null);

  // Settings (persisted)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UiSettings>(() => {
    if (typeof window === "undefined") {
      return { theme: "light", density: "comfortable", bubbleRadius: "rounded-xl", enterToSend: true, sound: true };
    }
    const raw = localStorage.getItem("staff:chat:settings");
    return raw
      ? (JSON.parse(raw) as UiSettings)
      : { theme: "light", density: "comfortable", bubbleRadius: "rounded-xl", enterToSend: true, sound: true };
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("staff:chat:settings", JSON.stringify(settings));
    if (settings.theme === "dark") document.documentElement.classList.add("dark");
    else if (settings.theme === "light") document.documentElement.classList.remove("dark");
  }, [settings]);

  // Me
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState("Me");
  const [meRole, setMeRole] = useState<ProviderRole>("nurse");

  // Conversations
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<ConversationPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedConv = convs.find((c) => c.id === selectedId) ?? null;

  // Unread (patient → staff)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // Filters
  const [tab, setTab] = useState<"all" | "new" | "pinned" | "archived">("all");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [q]);

  // New message modal
  const [modalOpen, setModalOpen] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [patients, setPatients] = useState<PatientAssigned[]>([]);
  const filteredPatients = useMemo(() => {
    const v = pSearch.trim().toLowerCase();
    if (!v) return patients;
    return patients.filter((p) => (p.full_name ?? "").toLowerCase().includes(v) || (p.email ?? "").toLowerCase().includes(v));
  }, [patients, pSearch]);

  // URL sync helper
  function syncUrlOpen(id: string) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("open", id);
    window.history.replaceState({}, "", url.toString());
  }
  function openConversation(id: string) {
    setSelectedId(id);
    setUnreadMap((m) => ({ ...m, [id]: 0 }));
    syncUrlOpen(id);
  }

  // Bootstrap
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) { router.replace("/staff/login?redirect=/staff/messages"); return; }
      setMeId(uid);

      setMeName((au.user?.user_metadata?.full_name as string) || au.user?.email || "Me");
      const staff = await supabase.from("staff").select("role, department, first_name, last_name").eq("user_id", uid).maybeSingle();
      const role = staff.error ? null : ((staff.data?.role as string | null) ?? null);
      const dept = staff.error ? null : ((staff.data?.department as string | null) ?? null);
      setMeRole(mapStaffRole(role, dept));
      const first = (staff.data?.first_name ?? "").trim(), last = (staff.data?.last_name ?? "").trim();
      if (first || last) setMeName(`${first} ${last}`.trim());

      const list = await listConversationsForProvider(uid);
      setConvs(list);
      setLoading(false);

      // Unread snapshot
      const u = await supabase.from("v_staff_dm_unread").select("conversation_id, unread_from_patient").eq("provider_id", uid);
      if (!u.error) {
        const map: Record<string, number> = {};
        for (const r of (u.data as any[]) ?? []) map[r.conversation_id] = Number(r.unread_from_patient) || 0;
        setUnreadMap(map);
      }

      // Deep link (?open=)
      if (typeof window !== "undefined") {
        const id = new URLSearchParams(window.location.search).get("open");
        if (id) setSelectedId(id);
      }

      // Assigned patients for modal
      const v = await supabase
        .from("v_staff_assigned_patients")
        .select("user_id, full_name, email, avatar")
        .eq("staff_id", uid);
      if (!v.error && v.data) setPatients(v.data as PatientAssigned[]);
    })();
  }, [router]);

  // Keep selection valid across refreshes/filters
  useEffect(() => {
    if (!selectedId || convs.some((c) => c.id === selectedId)) return;
    if (convs.length) openConversation(convs[0].id);
  }, [convs, selectedId]);

  // Realtime list + unread bumps
  useEffect(() => {
    if (!meId) return;

    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const bump = (update: () => Promise<void>) => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => { void update(); }, 90);
    };

    const convCh = supabase
      .channel(`conv_${meId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `provider_id=eq.${meId}` },
        () => bump(async () => setConvs(await listConversationsForProvider(meId)))
      )
      .subscribe();

    const inboxCh = supabase
      .channel(`inbox_${meId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { conversation_id: string; sender_role: string; content: string; created_at: string };
          if (m.sender_role !== "patient") return;
          setConvs((cur) =>
            cur
              .map((c) => (c.id === m.conversation_id ? { ...c, last_message: m.content, updated_at: m.created_at } : c))
              .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
          );
          setUnreadMap((prev) => (selectedId === m.conversation_id ? prev : { ...prev, [m.conversation_id]: (prev[m.conversation_id] ?? 0) + 1 }));
        }
      )
      .subscribe();

    return () => {
      if (debounceId) clearTimeout(debounceId);
      supabase.removeChannel(convCh);
      supabase.removeChannel(inboxCh);
    };
  }, [meId, selectedId]);

  // Clear unread on open (server + local)
  useEffect(() => {
    if (!selectedId || !meId) return;
    (async () => {
      await markReadHelper(selectedId, "nurse");
      setUnreadMap((m) => ({ ...m, [selectedId]: 0 }));
      syncUrlOpen(selectedId);
      toast({ title: "Marked as read" }); // feedback
    })();
  }, [selectedId, meId]); // eslint-disable-line

  // Row actions (persist + merge returned DB truth) + toasts
  async function togglePin(id: string, next: boolean) {
    const { data, error } = await supabase
      .from("conversations")
      .update({ pinned: next })
      .eq("id", id)
      .select("id,pinned,archived_at,updated_at")
      .single();
    if (error) {
      toast({ title: "Failed to update pin", variant: "destructive" });
      return;
    }
    setConvs((cur) => cur.map((c) => (c.id === id ? { ...c, ...data } : c)));
    toast({ title: next ? "Pinned" : "Unpinned" });
  }

  async function toggleArchive(id: string, next: boolean) {
    const value = next ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from("conversations")
      .update({ archived_at: value as any })
      .eq("id", id)
      .select("id,pinned,archived_at,updated_at")
      .single();
    if (error) {
      toast({ title: "Failed to update archive", variant: "destructive" });
      return;
    }
    setConvs((cur) => cur.map((c) => (c.id === id ? { ...c, ...data } : c)));
    if (next && selectedId === id) setSelectedId(null);
    toast({ title: next ? "Archived" : "Unarchived" }); // ← visible feedback
  }

  async function markRead(id: string) {
    try {
      await markReadHelper(id, "nurse");
      setUnreadMap((m) => ({ ...m, [id]: 0 }));
      toast({ title: "Marked as read" });
    } catch {
      toast({ title: "Failed to mark as read", variant: "destructive" });
    }
  }

  // Back to dashboard
  const handleBack = () => router.push("/staff/dashboard");

  // Derived counts
  const counts = useMemo(() => {
    const archived = convs.filter((c) => !!c.archived_at).length;
    const pinned = convs.filter((c) => !!c.pinned && !c.archived_at).length;
    const newCount = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    return { archived, pinned, newCount };
  }, [convs, unreadMap]);

  // Filtering & sorting
  const filteredConvs = useMemo(() => {
    let list = convs.slice();
    if (tab === "archived") list = list.filter((c) => !!c.archived_at);
    else list = list.filter((c) => !c.archived_at);

    if (tab === "new") list = list.filter((c) => (unreadMap[c.id] ?? 0) > 0);
    if (tab === "pinned") list = list.filter((c) => !!c.pinned);

    if (qDebounced) {
      list = list.filter((c) =>
        (c.patient_name ?? c.patient_email ?? "patient").toLowerCase().includes(qDebounced) ||
        (c.last_message ?? "").toLowerCase().includes(qDebounced)
      );
    }
    list.sort((a, b) => {
      const ap = a.pinned ? 1 : 0; const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return a.updated_at < b.updated_at ? 1 : -1;
    });
    return list;
  }, [convs, tab, qDebounced, unreadMap]);

  async function startNewMessage(patient: PatientAssigned) {
    if (!meId) return;
    const { id: convId } = await ensureConversation(patient.user_id, { id: meId, name: meName, role: meRole });
    setConvs(await listConversationsForProvider(meId));
    openConversation(convId);
    setModalOpen(false);
    toast({ title: "Conversation started" });
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><SettingsIcon className="h-4 w-4" /> Settings</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Chat settings</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <div className="mt-2 flex gap-2">
                    {(["light","dark","system"] as const).map((v)=>(<Button key={v} variant={settings.theme===v?"default":"outline"} onClick={()=>setSettings((s)=>({...s,theme:v}))}>{v}</Button>))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Density</p>
                  <div className="mt-2 flex gap-2">
                    {(["comfortable","compact"] as const).map((v)=>(<Button key={v} variant={settings.density===v?"default":"outline"} onClick={()=>setSettings((s)=>({...s,density:v}))}>{v}</Button>))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Bubble roundness</p>
                  <div className="mt-2 flex gap-2">
                    {(["rounded-lg","rounded-xl","rounded-2xl"] as const).map((v)=>(<Button key={v} variant={settings.bubbleRadius===v?"default":"outline"} onClick={()=>setSettings((s)=>({...s,bubbleRadius:v}))}>{v.replace("rounded-","")}</Button>))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={settings.enterToSend?"default":"outline"} onClick={()=>setSettings((s)=>({...s,enterToSend:!s.enterToSend}))}>
                    {settings.enterToSend ? "Enter sends" : "Enter adds line"}
                  </Button>
                  <Button variant={settings.sound?"default":"outline"} onClick={()=>setSettings((s)=>({...s,sound:!s.sound}))}>
                    {settings.sound ? "Sounds on" : "Sounds off"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New message</Button>
          <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); router.refresh(); }}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversations */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Conversations</span>
              <div className="flex items-center gap-1 text-xs">
                <Button variant={tab === "all" ? "default" : "outline"} size="xs" onClick={() => setTab("all")}>
                  All
                </Button>
                <Button variant={tab === "new" ? "default" : "outline"} size="xs" onClick={() => setTab("new")}>
                  New {counts.newCount ? <Badge className="ml-1">{counts.newCount}</Badge> : null}
                </Button>
                <Button variant={tab === "pinned" ? "default" : "outline"} size="xs" onClick={() => setTab("pinned")}>
                  Pinned {counts.pinned ? <Badge className="ml-1">{counts.pinned}</Badge> : null}
                </Button>
                <Button variant={tab === "archived" ? "default" : "outline"} size="xs" onClick={() => setTab("archived")}>
                  Archived {counts.archived ? <Badge className="ml-1">{counts.archived}</Badge> : null}
                </Button>
              </div>
            </CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search patients…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={listRef} className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {loading && (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl border p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/3 rounded bg-gray-200" />
                          <div className="h-3 w-2/3 rounded bg-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && filteredConvs.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">No conversations to show.</div>
              )}

              <ul className="space-y-1 p-2">
                {filteredConvs.map((c) => {
                  const active = selectedId === c.id;
                  const un = unreadMap[c.id] ?? 0;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => openConversation(c.id)}
                        className={`group relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition
                          ${active ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={c.patient_avatar ?? undefined} />
                          <AvatarFallback>{initials(c.patient_name || c.patient_email || "Patient")}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                              {c.patient_name ?? c.patient_email ?? "Patient"}
                            </p>
                            <span className="ml-2 shrink-0 text-[11px] text-gray-500">{formatTime(c.updated_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                            {un > 0 && <Badge variant="default" className="ml-auto">{un}</Badge>}
                            {c.pinned && !c.archived_at && <Pin className="h-3.5 w-3.5 text-cyan-500" />}
                          </div>
                        </div>

                        {/* row actions */}
                        <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2">•••</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin(c.id, !c.pinned); }}>
                                {c.pinned ? <><PinOff className="mr-2 h-4 w-4" /> Unpin</> : <><Pin className="mr-2 h-4 w-4" /> Pin</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markRead(c.id); }}>
                                <CheckCheck className="mr-2 h-4 w-4" /> Mark read
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleArchive(c.id, !c.archived_at); }}>
                                {c.archived_at ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive</> : <><Archive className="mr-2 h-4 w-4" /> Archive</>}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Thread */}
        <div className="lg:col-span-2">
          {!selectedConv ? (
            <Card className="h-[540px] w-full">
              <CardContent className="h-full grid place-items-center text-sm text-gray-500">
                Select a conversation
              </CardContent>
            </Card>
          ) : (
            <ChatBox
              mode="staff"
              patientId={selectedConv.patient_id}
              providerId={meId!}
              providerName={meName}
              providerRole={meRole}
              settings={settings}
              conversationId={selectedConv.id}
            />
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white shadow-xl dark:bg-gray-950">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">New message</h3>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Close</Button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search patients…" className="pl-9" value={pSearch} onChange={(e) => setPSearch(e.target.value)} />
              </div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {filteredPatients.length === 0 && <div className="p-6 text-sm text-gray-500">No matches.</div>}
                {filteredPatients.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-3"
                    onClick={() => startNewMessage(p)}
                  >
                    <Avatar><AvatarImage src={p.avatar ?? undefined} /><AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.full_name ?? "Patient"}</div>
                      <div className="text-xs text-gray-500 truncate">{p.email ?? ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
