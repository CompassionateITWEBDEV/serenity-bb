"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, LogOut, ArrowLeft, Plus, X, Search, Send } from "lucide-react";
import Groups from "@/components/staff/Groups";
import DirectMessages from "@/components/staff/DirectMessages"; // keeps your existing panel; badges fed via props below (optional)
import { logout } from "@/lib/staff";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ConversationRow = {
  id: string;
  patient_id: string;
  provider_id: string | null;
  provider_name?: string | null;
  provider_role?: "doctor" | "nurse" | "counselor" | null;
  provider_avatar?: string | null;
  title?: string | null;
  updated_at: string;
};

type Conversation = {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_avatar: string | null;
  updated_at: string;
};

type PatientAssigned = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | "doctor" | "nurse" | "counselor";
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

const ToggleBtn = ({
  active, onClick, children, aria,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; aria: string }) => (
  <button
    aria-label={aria}
    onClick={onClick}
    className={`h-9 px-3 rounded-full inline-flex items-center gap-2 text-sm
      ${active ? "bg-cyan-500 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
  >
    {children}
  </button>
);

export default function StaffMessagesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"both" | "groups" | "dms">("both");

  // auth/staff
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState<string>("Me");
  const [meRole, setMeRole] = useState<"doctor" | "nurse" | "counselor">("nurse");

  // conversations + selection
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [compose, setCompose] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // assigned patients count (header)
  const [assignedCount, setAssignedCount] = useState<number>(0);

  // NEW MESSAGE modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [patients, setPatients] = useState<PatientAssigned[]>([]);
  const filteredPatients = useMemo(
    () =>
      patients.filter(
        (p) =>
          !pSearch ||
          (p.full_name ?? "").toLowerCase().includes(pSearch.toLowerCase()) ||
          (p.email ?? "").toLowerCase().includes(pSearch.toLowerCase()),
      ),
    [patients, pSearch],
  );

  // unread counts per conversation
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // ---- helpers ----
  function initials(name?: string | null) {
    const raw = (name ?? "P").trim();
    if (!raw) return "P";
    return raw.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  function mapStaffRole(role?: string | null, dept?: string | null): "doctor" | "nurse" | "counselor" {
    const r = (role ?? "").toLowerCase();
    const d = (dept ?? "").toLowerCase();
    if (r.includes("doctor") || r.includes("physician") || d.includes("medical")) return "doctor";
    if (r.includes("counselor") || r.includes("therapist") || d.includes("therapy")) return "counselor";
    return "nurse";
  }

  async function fetchAssignedPatients(uid: string) {
    // Try view (recommended)
    const v = await supabase
      .from("v_staff_assigned_patients")
      .select("user_id, full_name, email, avatar")
      .eq("staff_id", uid)
      .order("full_name", { ascending: true });
    if (!v.error && v.data) return v.data as PatientAssigned[];

    // Fallback: join
    const j = await supabase
      .from("patients")
      .select("user_id, full_name, email, avatar, patient_care_team!inner(staff_id)")
      .eq("patient_care_team.staff_id", uid);
    if (j.error) throw j.error;
    return (j.data || []).map((r: any) => ({
      user_id: r.user_id,
      full_name: r.full_name,
      email: r.email,
      avatar: r.avatar,
    })) as PatientAssigned[];
  }

  async function fetchConversations(uid: string) {
    const q = await supabase
      .from("conversations")
      .select("id, patient_id, provider_id, provider_name, provider_avatar, title, updated_at, patients:patient_id(full_name, avatar)")
      .eq("provider_id", uid)
      .order("updated_at", { ascending: false });
    if (q.error) throw q.error;
    const rows: ConversationRow[] = q.data as any;
    const mapped: Conversation[] = rows.map((r: any) => ({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: r.patients?.full_name ?? r.title ?? "Patient",
      patient_avatar: r.patients?.avatar ?? null,
      updated_at: r.updated_at,
    }));
    setConvs(mapped);
  }

  async function fetchUnread(uid: string) {
    const u = await supabase
      .from("v_staff_dm_unread")
      .select("conversation_id, unread_from_patient")
      .eq("provider_id", uid);
    if (u.error) return;
    const map: Record<string, number> = {};
    for (const row of u.data as any[]) {
      map[row.conversation_id] = Number(row.unread_from_patient) || 0;
    }
    setUnreadMap(map);
  }

  async function markRead(conversationId: string) {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .eq("read", false)
      .eq("sender_role", "patient");
    setUnreadMap((m) => ({ ...m, [conversationId]: 0 }));
  }

  async function ensureConversationWithPatient(patientId: string) {
    if (!meId) return null;

    // find
    const found = await supabase
      .from("conversations")
      .select("id")
      .eq("patient_id", patientId)
      .eq("provider_id", meId)
      .maybeSingle();
    if (!found.error && found.data) return found.data;

    // create
    const ins = await supabase
      .from("conversations")
      .insert({
        patient_id: patientId,
        provider_id: meId,
        provider_name: meName,
        provider_role: meRole,
        provider_avatar: null,
        title: "Conversation",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ins.error) {
      alert(ins.error.message);
      return null;
    }
    return ins.data;
  }

  async function sendMessage() {
    if (!selectedId || !meId || !compose.trim()) return;
    const content = compose.trim();
    setCompose("");

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: convs.find((c) => c.id === selectedId)?.patient_id || "",
      sender_id: meId,
      sender_name: meName,
      sender_role: meRole,
      content,
      created_at: new Date().toISOString(),
      read: true,
      urgent: false,
    };
    setMsgs((m) => [...m, optimistic]);

    const ins = await supabase.from("messages").insert({
      conversation_id: optimistic.conversation_id,
      patient_id: optimistic.patient_id,
      sender_id: optimistic.sender_id,
      sender_name: optimistic.sender_name,
      sender_role: optimistic.sender_role,
      content: optimistic.content,
      read: true,
      urgent: false,
    });
    if (ins.error) alert(ins.error.message);

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedId);
  }

  // ---- bootstrap auth + data ----
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.push("/staff/login");
        return;
      }
      const uid = auth.user.id;
      setMeId(uid);
      setMeName(
        (auth.user.user_metadata?.full_name as string) ||
          (auth.user.user_metadata?.name as string) ||
          auth.user.email ||
          "Me",
      );
      const staff = await supabase
        .from("staff")
        .select("role, department, first_name, last_name")
        .eq("user_id", uid)
        .maybeSingle();
      const role = staff.error ? null : (staff.data?.role as string | null);
      const dept = staff.error ? null : (staff.data?.department as string | null);
      setMeRole(mapStaffRole(role, dept));
      if (staff.data?.first_name || staff.data?.last_name) {
        setMeName(`${staff.data?.first_name ?? ""} ${staff.data?.last_name ?? ""}`.trim() || meName);
      }

      // initial loads
      await Promise.all([
        fetchConversations(uid),
        fetchUnread(uid),
        (async () => {
          // header count + New Message modal list
          const { count } = await supabase
            .from("patient_care_team")
            .select("patient_id", { count: "exact", head: true })
            .eq("staff_id", uid);
          if (mounted && typeof count === "number") setAssignedCount(count);
          const list = await fetchAssignedPatients(uid);
          if (mounted) setPatients(list);
        })(),
      ]);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ---- realtime subscriptions ----
  useEffect(() => {
    if (!meId) return;

    // conversations for me
    const convCh = supabase
      .channel(`conv_${meId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "conversations", event: "*", filter: `provider_id=eq.${meId}` },
        async () => {
          await fetchConversations(meId);
          await fetchUnread(meId);
        },
      )
      .subscribe();

    // patient_care_team for header live count
    const pctCh = supabase
      .channel(`pct_${meId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "patient_care_team", event: "INSERT", filter: `staff_id=eq.${meId}` },
        () => setAssignedCount((n) => (Number.isFinite(n) ? n + 1 : 1)),
      )
      .on(
        "postgres_changes",
        { schema: "public", table: "patient_care_team", event: "DELETE", filter: `staff_id=eq.${meId}` },
        () => setAssignedCount((n) => (Number.isFinite(n) ? Math.max(0, n - 1) : 0)),
      )
      .subscribe();

    // global messages listener (patient -> staff), bump unread counts when not on that thread
    const msgCh = supabase
      .channel(`msgs_staff_${meId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "INSERT" },
        (payload) => {
          const m = payload.new as MessageRow;
          if (m.sender_role !== "patient") return;
          // Only count if this conversation belongs to me (we can't filter server-side reliably)
          // We have convs in state; check membership:
          const belongs = convs.some((c) => c.id === m.conversation_id);
          if (!belongs) return;
          // If not viewing this convo, increment
          setUnreadMap((prev) => {
            if (selectedId === m.conversation_id) return prev;
            const curr = prev[m.conversation_id] ?? 0;
            return { ...prev, [m.conversation_id]: curr + 1 };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convCh);
      supabase.removeChannel(pctCh);
      supabase.removeChannel(msgCh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, convs, selectedId]);

  // Load messages + mark read on selection
  useEffect(() => {
    if (!selectedId) return;

    (async () => {
      const res = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (!res.error) setMsgs((res.data as MessageRow[]) || []);

      // mark read for patient -> staff
      await markRead(selectedId);

      // autoscroll
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
      );
    })();

    // realtime for the open conversation
    const ch = supabase
      .channel(`conv_msgs_${selectedId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "*", filter: `conversation_id=eq.${selectedId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setMsgs((m) => [...m, payload.new as MessageRow]);
            // if it was from patient, we just marked read above; also zero badge
            if ((payload.new as MessageRow).sender_role === "patient") {
              await markRead(selectedId);
            }
          } else {
            // refresh to stay consistent for updates/deletes
            const res = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", selectedId)
              .order("created_at", { ascending: true });
            if (!res.error) setMsgs((res.data as MessageRow[]) || []);
          }
          requestAnimationFrame(() =>
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- UI ----
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor">
                <path strokeWidth="2" d="M12 3l9 7-9 7-9-7 9-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Console</h1>
              <p className="text-xs text-slate-500">Care operations at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" /> {`Live · ${assignedCount} patients`}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1" onClick={async () => { await logout(); router.refresh(); }}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Title + controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-700" fill="none" stroke="currentColor">
                <path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/>
              </svg>
            </span>
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> New message
            </Button>
            <ToggleBtn active={mode==="groups"} onClick={()=>setMode("groups")} aria="Show Internal Groups">Groups</ToggleBtn>
            <ToggleBtn active={mode==="dms"} onClick={()=>setMode("dms")} aria="Show Direct Messages">Direct</ToggleBtn>
            <ToggleBtn active={mode==="both"} onClick={()=>setMode("both")} aria="Show Both">Both</ToggleBtn>
            <Button variant="ghost" size="sm" className="gap-2 ml-2" onClick={() => router.push("/staff/dashboard")}>
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Panels */}
        {mode === "both" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="w-full"><Groups /></div>
            <div className="w-full">
              {/* Optional: your DirectMessages component could accept unreadMap via props. */}
              <DirectMessages />
            </div>
          </div>
        ) : mode === "groups" ? (
          <div className="w-full"><Groups /></div>
        ) : (
          <div className="w-full">
            <DirectMessages />
          </div>
        )}

        {/* Lightweight built-in DM panel (shows unread badges, compose box) */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Conversations list with unread badges */}
          <Card className="md:col-span-1">
            <CardHeader><CardTitle>Direct Messages</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {convs.map((c) => {
                  const active = selectedId === c.id;
                  const un = unreadMap[c.id] ?? 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 border-l-4 ${active ? "border-cyan-500 bg-cyan-50" : "border-transparent"}`}
                    >
                      <Avatar>
                        <AvatarImage src={c.patient_avatar ?? undefined} />
                        <AvatarFallback>{initials(c.patient_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium text-gray-900">{c.patient_name ?? "Patient"}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">patient</p>
                      </div>
                      {!!un && <Badge className="ml-auto">{un}</Badge>}
                    </button>
                  );
                })}
                {convs.length === 0 && <div className="p-6 text-sm text-gray-500">No conversations yet.</div>}
              </div>
            </CardContent>
          </Card>

          {/* Active conversation */}
          <Card className="md:col-span-2 flex flex-col">
            {!selectedId ? (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-sm text-gray-500">Select a conversation</div>
              </CardContent>
            ) : (
              <>
                <CardContent ref={listRef} className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {msgs.map((m) => {
                      const isOwn = m.sender_id === meId;
                      return (
                        <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isOwn ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                            <div className={`text-[10px] opacity-60 mb-1`}>{isOwn ? meName : "Patient"}</div>
                            <div className="whitespace-pre-wrap">{m.content}</div>
                            <div className={`text-[10px] opacity-60 mt-1`}>{new Date(m.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message…"
                      value={compose}
                      onChange={(e) => setCompose(e.target.value)}
                      className="flex-1 min-h-[40px] max-h-[120px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>

      {/* New Message Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">New message</h3>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search patients…" className="pl-9" value={pSearch} onChange={(e) => setPSearch(e.target.value)} />
              </div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {filteredPatients.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3"
                    onClick={async () => {
                      const conv = await ensureConversationWithPatient(p.user_id);
                      if (!conv) return;
                      await fetchConversations(meId!);
                      await fetchUnread(meId!);
                      setSelectedId(conv.id);
                      setModalOpen(false);
                    }}
                  >
                    <Avatar><AvatarImage src={p.avatar ?? undefined} /><AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.full_name ?? "Patient"}</div>
                      <div className="text-xs text-gray-500 truncate">{p.email ?? ""}</div>
                    </div>
                  </button>
                ))}
                {filteredPatients.length === 0 && <div className="p-6 text-sm text-gray-500">No matches.</div>}
              </div>
            </div>
            <div className="border-t p-3 text-right">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
