"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Search } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import ChatBox from "@/components/chat/ChatBox";
import type { ProviderRole } from "@/lib/chat";
import {
  listConversationsForProvider,
  ensureConversation,
  markRead as markReadHelper,
} from "@/lib/chat";

type ConversationPreview = Awaited<ReturnType<typeof listConversationsForProvider>>[number];
type PatientAssigned = { user_id: string; full_name: string | null; email: string | null; avatar: string | null };

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

export default function StaffMessagesPage() {
  const router = useRouter();

  // me
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState("Me");
  const [meRole, setMeRole] = useState<ProviderRole>("nurse");

  // conversations + selection
  const [convs, setConvs] = useState<ConversationPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedConv = convs.find((c) => c.id === selectedId) ?? null;

  // unread (drives "New requests" view)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // filter UI
  const [tab, setTab] = useState<"all" | "new">("all");
  const [q, setQ] = useState("");

  // modal: new message to assigned patient
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

  const filteredConvs = useMemo(() => {
    const v = q.trim().toLowerCase();
    const list =
      tab === "new"
        ? convs.filter((c) => (unreadMap[c.id] ?? 0) > 0)
        : convs;
    if (!v) return list;
    return list.filter((c) =>
      (c.patient_name ?? c.patient_email ?? "patient").toLowerCase().includes(v) ||
      (c.last_message ?? "").toLowerCase().includes(v)
    );
  }, [convs, tab, q, unreadMap]);

  // bootstrap
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

      setConvs(await listConversationsForProvider(uid));

      // unread snapshot
      const u = await supabase
        .from("v_staff_dm_unread")
        .select("conversation_id, unread_from_patient")
        .eq("provider_id", uid);
      if (!u.error) {
        const map: Record<string, number> = {};
        for (const r of (u.data as any[]) ?? []) map[r.conversation_id] = Number(r.unread_from_patient) || 0;
        setUnreadMap(map);
      }

      // deep link (?open=)
      if (typeof window !== "undefined") {
        const id = new URLSearchParams(window.location.search).get("open");
        if (id) setSelectedId(id);
      }

      // assigned patients (for "New message")
      const v = await supabase
        .from("v_staff_assigned_patients")
        .select("user_id, full_name, email, avatar")
        .eq("staff_id", uid);
      if (!v.error && v.data) {
        setPatients(v.data as PatientAssigned[]);
      } else {
        const j = await supabase
          .from("patients")
          .select("user_id, full_name, email, avatar, patient_care_team!inner(staff_id)")
          .eq("patient_care_team.staff_id", uid);
        if (!j.error && j.data) {
          setPatients(
            (j.data as any[]).map((r) => ({
              user_id: r.user_id,
              full_name: r.full_name,
              email: r.email,
              avatar: r.avatar,
            }))
          );
        }
      }
    })();
  }, [router]);

  // Realtime: keep list fresh + unread bumps (patient sends)
  useEffect(() => {
    if (!meId) return;

    const convCh = supabase
      .channel(`conv_${meId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `provider_id=eq.${meId}` },
        async () => setConvs(await listConversationsForProvider(meId))
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `provider_id=eq.${meId}` },
        async () => setConvs(await listConversationsForProvider(meId))
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
          setUnreadMap((prev) => {
            if (selectedId === m.conversation_id) return prev;
            return { ...prev, [m.conversation_id]: (prev[m.conversation_id] ?? 0) + 1 };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convCh);
      supabase.removeChannel(inboxCh);
    };
  }, [meId, selectedId]);

  // When opening a thread from “New” tab, clear unread (patient → staff)
  useEffect(() => {
    if (!selectedId || !meId) return;
    (async () => {
      await markReadHelper(selectedId, "nurse"); // viewer is staff; any provider role ok here
      setUnreadMap((m) => ({ ...m, [selectedId]: 0 }));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href); url.searchParams.set("open", selectedId);
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [selectedId, meId]);

  async function startNewMessage(patient: PatientAssigned) {
    if (!meId) return;
    const { id: convId } = await ensureConversation(patient.user_id, { id: meId, name: meName, role: meRole });
    setConvs(await listConversationsForProvider(meId));
    setSelectedId(convId);
    setModalOpen(false);
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New message</Button>
          <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); router.refresh(); }}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversations + New requests filter */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Conversations</span>
              <div className="flex items-center gap-1 text-xs">
                <Button variant={tab === "all" ? "default" : "outline"} size="xs" onClick={() => setTab("all")}>All</Button>
                <Button variant={tab === "new" ? "default" : "outline"} size="xs" onClick={() => setTab("new")}>
                  New {Object.values(unreadMap).reduce((a, b) => a + b, 0) ? <Badge className="ml-1">{Object.values(unreadMap).reduce((a, b) => a + b, 0)}</Badge> : null}
                </Button>
              </div>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search patients…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredConvs.length === 0 && <div className="p-6 text-sm text-gray-500">{tab === "new" ? "No new requests." : "No conversations yet."}</div>}
              {filteredConvs.map((c) => {
                const active = selectedId === c.id;
                const un = unreadMap[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center gap-3 border-l-4 p-4 text-left hover:bg-gray-50 ${active ? "border-cyan-500 bg-cyan-50" : "border-transparent"}`}
                  >
                    <Avatar><AvatarImage src={c.patient_avatar ?? undefined} /><AvatarFallback>{initials(c.patient_name ?? c.patient_email)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium text-gray-900">{c.patient_name ?? c.patient_email ?? "Patient"}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                    </div>
                    {!!un && <Badge className="ml-auto">{un}</Badge>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Thread (ChatBox) */}
        <div className="lg:col-span-2">
          {!selectedConv ? (
            <Card className="h-[540px] w-full">
              <CardContent className="h-full grid place-items-center text-sm text-gray-500">Select a conversation</CardContent>
            </Card>
          ) : (
            <ChatBox
              mode="staff"
              patientId={selectedConv.patient_id}
              providerId={meId!}
              providerName={meName}
              providerRole={meRole}
            />
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white">
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
                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3"
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
