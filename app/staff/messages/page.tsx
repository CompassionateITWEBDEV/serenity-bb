// app/staff/messages/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, LogOut } from "lucide-react";

import { supabase, ensureSession, logout } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import ChatBox from "@/components/chat/ChatBox";
import type { ProviderRole } from "@/lib/chat";
import { listConversationsForProvider, ensureConversation } from "@/lib/chat";

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

  // list + selection
  const [convs, setConvs] = useState<ConversationPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedConv = convs.find((c) => c.id === selectedId) ?? null;

  // unread (optional; uses view if present)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // modal: new message to assigned patient
  const [modalOpen, setModalOpen] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [patients, setPatients] = useState<PatientAssigned[]>([]);
  const filteredPatients = useMemo(() => {
    const q = pSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
    );
  }, [patients, pSearch]);

  // bootstrap
  useEffect(() => {
    (async () => {
      const session = await ensureSession({ graceMs: 200, fallbackMs: 1200 });
      if (!session) { router.replace("/staff/login?redirect=/staff/messages"); return; }

      const uid = session.user.id;
      setMeId(uid);

      const u = (await supabase.auth.getUser()).data.user;
      if (u) setMeName((u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || "Me");

      const staff = await supabase.from("staff").select("role, department, first_name, last_name").eq("user_id", uid).maybeSingle();
      const role = staff.error ? null : ((staff.data?.role as string | null) ?? null);
      const dept = staff.error ? null : ((staff.data?.department as string | null) ?? null);
      setMeRole(mapStaffRole(role, dept));
      const first = (staff.data?.first_name ?? "").trim(), last = (staff.data?.last_name ?? "").trim();
      if (first || last) setMeName(`${first} ${last}`.trim());

      const list = await listConversationsForProvider(uid);
      setConvs(list);

      // optional unread snapshot
      const ures = await supabase.from("v_staff_dm_unread").select("conversation_id, unread_from_patient").eq("provider_id", uid);
      if (!ures.error) {
        const map: Record<string, number> = {};
        for (const r of (ures.data as any[]) ?? []) map[r.conversation_id] = Number(r.unread_from_patient) || 0;
        setUnreadMap(map);
      }

      // deep link (?open=)
      if (typeof window !== "undefined") {
        const id = new URLSearchParams(window.location.search).get("open");
        if (id) setSelectedId(id);
      }

      // assigned patients list (either view or fallback join)
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

  // realtime: keep list fresh + unread bumps
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

  async function startNewMessage(patient: PatientAssigned) {
    if (!meId) return;
    const { id: convId } = await ensureConversation(patient.user_id, {
      id: meId,
      name: meName,
      role: meRole,
    });
    // refresh list + select
    setConvs(await listConversationsForProvider(meId));
    setSelectedId(convId);
    setModalOpen(false);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("open", convId);
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Messages</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> New message
          </Button>
          <Button variant="outline" size="sm" onClick={async () => { await logout(); router.refresh(); }}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Conversation list */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Direct Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {convs.length === 0 && <div className="p-6 text-sm text-gray-500">No conversations.</div>}
              {convs.map((c) => {
                const active = selectedId === c.id;
                const un = unreadMap[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 border-l-4 ${
                      active ? "border-cyan-500 bg-cyan-50" : "border-transparent"
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={c.patient_avatar ?? undefined} />
                      <AvatarFallback>{initials(c.patient_name ?? c.patient_email)}</AvatarFallback>
                    </Avatar>
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
        <div className="md:col-span-2">
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
                <Input
                  placeholder="Search patients…"
                  className="pl-9"
                  value={pSearch}
                  onChange={(e) => setPSearch(e.target.value)}
                />
              </div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {filteredPatients.length === 0 && (
                  <div className="p-6 text-sm text-gray-500">No matches.</div>
                )}
                {filteredPatients.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3"
                    onClick={() => startNewMessage(p)}
                  >
                    <Avatar>
                      <AvatarImage src={p.avatar ?? undefined} />
                      <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                    </Avatar>
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
