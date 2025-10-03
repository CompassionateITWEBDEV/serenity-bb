"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, Send, UserPlus, X } from "lucide-react";
import Swal from "sweetalert2";

type ProviderRole = "doctor" | "nurse" | "counselor";

type Conversation = {
  id: string;
  patient_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: ProviderRole;
  provider_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | ProviderRole;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

type CareTeamStaff = {
  user_id: string;
  full_name: string | null;
  role: ProviderRole;
  avatar_url: string | null;
  email: string | null;
};

function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  return s.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// map staff.role → conversations.provider_role
function toProviderRole(role?: string | null): ProviderRole {
  const r = (role ?? "").toLowerCase();
  if (r.includes("doc")) return "doctor";
  if (r.includes("nurse")) return "nurse";
  if (r.includes("counsel")) return "counselor";
  return "nurse";
}

export default function PatientMessagesPage() {
  const { isAuthenticated, loading, user, patient } = useAuth();
  const meId = isAuthenticated ? (patient?.user_id || (patient as any)?.id || user?.id) : null;

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [staffList, setStaffList] = useState<CareTeamStaff[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

  const listRef = useRef<HTMLDivElement>(null);

  // Conversations
  useEffect(() => {
    if (!meId) return;
    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
        .eq("patient_id", meId)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) {
        await Swal.fire("Error loading conversations", error.message, "error");
        return;
      }
      setConvs((data as Conversation[]) || []);
    })();
  }, [meId]);

  // Care team picker — **REVISED**: reverse join via patient_care_team
  useEffect(() => {
    if (!meId) return;
    (async () => {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          user_id, first_name, last_name, role, avatar_url, email,
          patient_care_team!inner(patient_id)
        `)
        .eq("patient_care_team.patient_id", meId);

      if (error) {
        await Swal.fire("Error loading care team", error.message, "error");
        return;
      }

      const rows: CareTeamStaff[] = (data as any[] || []).map((s) => ({
        user_id: s.user_id,
        full_name: [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Staff",
        role: toProviderRole(s.role),
        avatar_url: s.avatar_url ?? null,
        email: s.email ?? null,
      }));

      if (!rows.length) {
        await Swal.fire({
          icon: "info",
          title: "No staff found",
          text: "Ask the clinic to add providers to your care team.",
          timer: 2500,
          showConfirmButton: false,
        });
      }

      setStaffList(rows);
    })();
  }, [meId]);

  // Realtime conversations
  useEffect(() => {
    if (!meId) return;
    const ch = supabase
      .channel(`convs_${meId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "conversations", event: "*", filter: `patient_id=eq.${meId}` },
        async () => {
          const { data } = await supabase
            .from("conversations")
            .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
            .eq("patient_id", meId)
            .order("last_message_at", { ascending: false });
          setConvs((data as Conversation[]) || []);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [meId]);

  // Messages + realtime
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) {
        await Swal.fire("Error loading messages", error.message, "error");
        return;
      }
      if (alive) {
        setMsgs((data as MessageRow[]) || []);
        await markRead(selectedId);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "*", filter: `conversation_id=eq.${selectedId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const m = payload.new as MessageRow;
            setMsgs((prev) => [...prev, m]);
            if (m.sender_role !== "patient") await markRead(selectedId);
            requestAnimationFrame(() =>
              listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
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
  }, [selectedId]);

  async function markRead(conversationId: string) {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_role", "patient")
      .eq("read", false);
  }

  // Ensure/create conversation
  async function ensureConversationWith(staff: CareTeamStaff): Promise<Conversation | null> {
    if (!meId) return null;

    const found = await supabase
      .from("conversations")
      .select("*")
      .eq("patient_id", meId)
      .eq("provider_id", staff.user_id)
      .maybeSingle<Conversation>();
    if (!found.error && found.data) return found.data;

    const insert = await supabase
      .from("conversations")
      .insert({
        patient_id: meId,
        provider_id: staff.user_id,
        provider_name: staff.full_name || staff.email || "Staff",
        provider_role: staff.role,
        provider_avatar: staff.avatar_url,
        last_message: null,
        last_message_at: new Date().toISOString(),
      })
      .select("*")
      .single<Conversation>();
    if (insert.error) {
      await Swal.fire("Could not start conversation", insert.error.message, "error");
      return null;
    }
    await Swal.fire("Conversation started", staff.full_name ?? "Care team", "success");
    return insert.data;
  }

  async function handleSend() {
    if (!selectedId || !meId || !compose.trim()) return;

    const meName =
      (user?.user_metadata?.full_name as string) ||
      (user?.user_metadata?.name as string) ||
      patient?.full_name ||
      user?.email ||
      "You";

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: meId,
      sender_id: meId,
      sender_name: meName,
      sender_role: "patient",
      content: compose.trim(),
      created_at: new Date().toISOString(),
      read: true,
      urgent: false,
    };
    setMsgs((m) => [...m, optimistic]);
    setCompose("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: meId,
      sender_id: meId,
      sender_name: meName,
      sender_role: "patient",
      content: optimistic.content,
      read: true,
      urgent: false,
    });

    if (error) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      await Swal.fire("Send failed", error.message, "error");
      return;
    }

    await supabase
      .from("conversations")
      .update({ last_message: optimistic.content, last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
  }

  // Derived
  const filteredConvs = useMemo(() => {
    const v = q.trim().toLowerCase();
    const base = convs.slice().sort((a, b) => {
      const ta = a.last_message_at || a.created_at;
      const tb = b.last_message_at || b.created_at;
      return (tb ?? "").localeCompare(ta ?? "");
    });
    if (!v) return base;
    return base.filter(
      (c) =>
        c.provider_name.toLowerCase().includes(v) ||
        (c.last_message ?? "").toLowerCase().includes(v)
    );
  }, [convs, q]);

  const staffFiltered = useMemo(() => {
    const v = pickerQ.trim().toLowerCase();
    return !v
      ? staffList
      : staffList.filter(
          (s) =>
            (s.full_name ?? "").toLowerCase().includes(v) ||
            (s.email ?? "").toLowerCase().includes(v) ||
            s.role.toLowerCase().includes(v)
        );
  }, [staffList, pickerQ]);

  if (loading || !isAuthenticated) {
    return <div className="container mx-auto p-6 max-w-7xl"><p className="text-gray-600">Loading…</p></div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-600">Chat with your care team</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setPickerOpen(true)}>
          <UserPlus className="h-4 w-4" /> New message
        </Button>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversations */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search providers or last message…"
                className="pl-10"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredConvs.map((c) => {
                const active = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center gap-3 border-l-4 p-4 text-left hover:bg-gray-50 ${
                      active ? "border-cyan-500 bg-cyan-50" : "border-transparent"
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={c.provider_avatar ?? undefined} />
                      <AvatarFallback>{initials(c.provider_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium text-gray-900">
                          {c.provider_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(c.last_message_at ?? c.created_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {c.provider_role}
                        </Badge>
                        <p className="truncate text-xs text-gray-500">
                          {c.last_message ?? "—"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredConvs.length === 0 && (
                <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thread */}
        <Card className="flex flex-col lg:col-span-2">
          {!selectedId ? (
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Select a conversation
                </h3>
                <p className="text-gray-600">Pick a provider or start a new one</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardContent ref={listRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {msgs.map((m) => {
                    const own = m.sender_role === "patient" && m.sender_id === meId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${own ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                            own ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                          <p
                            className={`mt-1 text-xs ${
                              own ? "text-cyan-100" : "text-gray-500"
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {msgs.length === 0 && (
                    <div className="text-sm text-gray-500">No messages yet. Say hi 👋</div>
                  )}
                </div>
              </CardContent>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    className="min-h-[40px] max-h-[120px] flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={!compose.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Staff picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">Start a conversation</h3>
              <Button variant="ghost" size="icon" onClick={() => setPickerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search staff by name, email, role…"
                  className="pl-9"
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                />
              </div>
              <div className="max-h-80 divide-y overflow-y-auto">
                {staffFiltered.map((s) => (
                  <button
                    key={s.user_id}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50"
                    onClick={async () => {
                      const conv = await ensureConversationWith(s);
                      if (!conv) return;
                      const { data } = await supabase
                        .from("conversations")
                        .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
                        .eq("patient_id", meId!)
                        .order("last_message_at", { ascending: false });
                      setConvs((data as Conversation[]) || []);
                      setSelectedId(conv.id);
                      setPickerOpen(false);
                    }}
                  >
                    <Avatar>
                      <AvatarImage src={s.avatar_url ?? undefined} />
                      <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.full_name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{s.role}</Badge>
                        <span className="truncate text-xs text-gray-500">{s.email ?? ""}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {staffFiltered.length === 0 && (
                  <div className="p-6 text-sm text-gray-500">No matches found.</div>
                )}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Only staff on your care team are shown. Ask the clinic to add a provider if needed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
