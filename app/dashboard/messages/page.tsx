"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Phone, Video, Send, Image as ImageIcon, Camera, Mic,
  MessageCircle, Search
} from "lucide-react";
import Swal from "sweetalert2";

/* ------------------------------- Types ---------------------------------- */

type ProviderRole = "doctor" | "nurse" | "counselor";
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
  meta?: { audio_url?: string; image_url?: string; duration_sec?: number } | null;
};

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

/* ---------------------------- Utils/helpers ----------------------------- */

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

/* ------------------------------ Page ------------------------------------ */

export default function PatientMessagesPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);

  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [loading, setLoading] = useState(true);

  const [providerOnline, setProviderOnline] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceTimer = useRef<number | null>(null);

  /* ------------------------- Auth + ensure patient ------------------------ */
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) { router.replace("/login"); return; }

      // ensure this user is a patient (not staff)
      const { data: p } = await supabase
        .from("patients")
        .select("user_id, first_name, last_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      if (!p?.user_id) {
        await Swal.fire("Access denied", "This page is for patients.", "error");
        router.replace("/");
        return;
      }

      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || au.user?.email || "Me";
      setMe({ id: uid, name });
      setLoading(false);
    })();
  }, [router]);

  /* ------------------------------ Heartbeat ------------------------------- */
  useEffect(() => {
    if (!me) return;

    const beat = async () => { try { await supabase.rpc("patient_heartbeat"); } catch {} };

    // immediate + burst then slow interval
    (async () => {
      await beat();
      const fast = setInterval(beat, 1000);
      setTimeout(() => clearInterval(fast), 2200);
    })();
    const slow = setInterval(beat, 10000);

    // RT presence channel other services can watch: online:<patientId>
    const ch = supabase.channel(`online:${me.id}`, { config: { presence: { key: me.id } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const ping = () => ch.track({ online: true, at: Date.now() });
        ping(); setTimeout(ping, 600);
      }
    });

    const onFocus = () => { void beat(); try { ch.track({ online: true, at: Date.now() }); } catch {} };
    const onVis = () => { if (document.visibilityState === "visible") onFocus(); };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(slow);
      try { supabase.removeChannel(ch); } catch {}
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [me]);

  /* ------------------------ Load conversations (patient) ------------------ */
  useEffect(() => {
    if (!me) return;
    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
        .eq("patient_id", me.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) { await Swal.fire("Load error", error.message, "error"); return; }
      setConvs((data as Conversation[]) || []);

      // optional deep-link ?providerId=... → auto-select/create
      const providerId = params.get("providerId");
      if (providerId) {
        const exists = (data || []).find((c) => c.provider_id === providerId);
        if (exists) setSelectedId(exists.id);
      }
    })();
  }, [me, params]);

  /* ----------------------------- Staff directory ------------------------- */
  useEffect(() => {
    if (!me) return;
    (async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("user_id, first_name, last_name, email, title, department, role, avatar_url, active")
        .eq("active", true)
        .order("first_name", { ascending: true });
      if (error) { await Swal.fire("Load error", error.message, "error"); return; }
      setStaffDir((data as StaffRow[]) || []);
    })();
  }, [me]);

  /* -------------------- Open/subscribe a conversation thread -------------- */
  useEffect(() => {
    if (!selectedId || !me) return;

    let alive = true;
    setProviderOnline(false);

    (async () => {
      const { data, error } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) { await Swal.fire("Load error", error.message, "error"); return; }
      if (alive) {
        setMsgs((data as MessageRow[]) || []);
        requestAnimationFrame(() =>
          listRef.current?.scrollTo({ top: listRef.current!.scrollHeight })
        );
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`, { config: { presence: { key: me.id } } })
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
              .from("messages").select("*")
              .eq("conversation_id", selectedId)
              .order("created_at", { ascending: true });
            setMsgs((data as MessageRow[]) || []);
          }
        }
      );

    // presence for provider Online/Offline in header
    const compute = () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const others = Object.values(state).flat() as any[];
      const online = others.some((s: any) => s?.uid && s.uid !== me.id);
      setProviderOnline(online);
    };
    ch.on("presence", { event: "sync" }, compute)
      .on("presence", { event: "join" }, compute)
      .on("presence", { event: "leave" }, compute)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          try { ch.track({ uid: me.id, at: Date.now(), status: "idle" }); } catch {}
          compute();
          if (presenceTimer.current) window.clearTimeout(presenceTimer.current);
          presenceTimer.current = window.setTimeout(compute, 700);
        }
      });

    const keepAlive = setInterval(() => {
      try { ch.track({ uid: me.id, at: Date.now(), status: "idle" }); } catch {}
    }, 1500);

    threadChRef.current = ch;

    return () => {
      alive = false;
      clearInterval(keepAlive);
      try { supabase.removeChannel(ch); } catch {}
      threadChRef.current = null;
    };
  }, [selectedId, me]);

  /* ------------------------- Start a new conversation --------------------- */
  const [starting, setStarting] = useState(false);
  const startChatWith = useCallback(async (staff: StaffRow) => {
    if (!me || starting) return;
    setStarting(true);
    try {
      // Most projects create via API to apply server checks; adapt to your API path:
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/chat/new", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerId: staff.user_id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to start chat");

      const conv: Conversation = payload.conversation;

      if (!conv.provider_name || !conv.provider_role) {
        const provider_name = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email || "Staff";
        const provider_role = toProviderRole(staff.role ?? "");
        const provider_avatar = staff.avatar_url ?? null;
        await supabase.from("conversations").update({ provider_name, provider_role, provider_avatar }).eq("id", conv.id);
        conv.provider_name = provider_name; conv.provider_role = provider_role; conv.provider_avatar = provider_avatar;
      }

      setConvs((prev) => upsertConversation(prev, conv));
      setSelectedId(conv.id);
    } catch (e: any) {
      await Swal.fire("Could not start chat", e.message || String(e), "error");
    } finally {
      setStarting(false);
    }
  }, [me, starting]);

  /* --------------------------------- Send -------------------------------- */
  async function send() {
    if (!me || !selectedId || !compose.trim()) return;

    const conv = convs.find((c) => c.id === selectedId);
    const content = compose.trim();
    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: conv?.patient_id ?? me.id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content,
      created_at: new Date().toISOString(),
      read: false,
      urgent: false,
    };

    setMsgs((m) => [...m, optimistic]);
    setCompose("");

    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: conv?.patient_id ?? me.id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content,
      read: false,
      urgent: false,
    });

    if (insErr) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      await Swal.fire("Send failed", insErr.message, "error");
      return;
    }

    await supabase
      .from("conversations")
      .update({ last_message: content, last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
  }

  /* ------------------------------ Derived UI ----------------------------- */
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
  }, [staffDir, search]);

  const selectedConv = useMemo(() => convs.find((c) => c.id === selectedId) || null, [convs, selectedId]);
  const otherName = selectedConv?.provider_name ?? "Staff";
  const otherAvatar = selectedConv?.provider_avatar ?? undefined;

  /* --------------------------------- UI ---------------------------------- */
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm min-h-screen bg-white dark:bg-zinc-900 shadow-sm">
        {/* Top bar */}
        <div className="px-3 py-2 border-b flex items-center gap-2 sticky top-0 bg-white/90 backdrop-blur dark:bg-zinc-900/80 z-10">
          <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherAvatar} />
            <AvatarFallback>{initials(otherName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 leading-tight">
            <div className="text-[15px] font-semibold">{selectedId ? otherName : "Direct Message"}</div>
            {!!selectedId && (
              <div className="flex items-center gap-1 text-[11px]">
                <span className={`inline-block h-2 w-2 rounded-full ${providerOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                <span className={providerOnline ? "text-emerald-600" : "text-gray-500"}>{providerOnline ? "Online" : "Offline"}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full"><Phone className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full"><Video className="h-5 w-5" /></Button>
        </div>

        {/* List or Thread */}
        {!selectedId ? (
          <div className="p-4">
            <div className="mb-3 px-3">
              <div className="text-sm text-gray-500 font-semibold">Direct Message</div>
            </div>

            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search staff…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>

            {/* Existing conversations */}
            <div className="space-y-1">
              {convsSorted
                .filter((c) => (search ? (c.provider_name ?? "Staff").toLowerCase().includes(search) : true))
                .map((c) => (
                  <button
                    key={`conv-${c.id}`}
                    onClick={() => setSelectedId(c.id)}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 active:scale-[.99]"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={c.provider_avatar ?? undefined} />
                      <AvatarFallback>{initials(c.provider_name ?? "Staff")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{c.provider_name ?? "Staff"}</p>
                        <span className="text-[11px] text-gray-500">
                          {new Date(c.last_message_at ?? c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{c.provider_role ?? "staff"}</Badge>
                        <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>

            {/* Staff directory */}
            <div className="px-3 pt-4 text-xs font-semibold uppercase text-gray-500">Staff directory</div>
            {filteredStaff.map((s) => {
              const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Staff";
              return (
                <button
                  key={`staff-${s.user_id}`}
                  onClick={() => startChatWith(s)}
                  disabled={starting}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 disabled:opacity-50"
                  title="Start chat"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      <span className="text-[11px] text-gray-500">{s.title ?? s.department ?? ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{toProviderRole(s.role ?? "")}</Badge>
                      <p className="truncate text-xs text-gray-500">{s.email}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredStaff.length === 0 && <div className="p-6 text-sm text-gray-500">No staff found.</div>}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={listRef} className="min-h-0 grow overflow-y-auto p-3 space-y-3">
              {msgs.map((m) => {
                const own = m.sender_id === me?.id;
                const bubble = own
                  ? "bg-cyan-500 text-white rounded-2xl px-4 py-2 shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-2";
                return (
                  <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[88%]">
                      <div className={bubble}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <div className={`mt-1 text-[10px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {msgs.length === 0 && <div className="text-sm text-gray-500 text-center py-6">No messages yet.</div>}
            </div>

            {/* Composer */}
            <div className="border-t p-2">
              <div className="flex items-end gap-2">
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" className="rounded-full"><ImageIcon className="h-5 w-5" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="rounded-full"><Camera className="h-5 w-5" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="rounded-full"><Mic className="h-5 w-5" /></Button>
                </div>

                <Textarea
                  ref={textareaRef}
                  placeholder="Aa"
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  className="min-h-[40px] max-h-[120px] flex-1 rounded-full px-4 py-2 bg-slate-100 dark:bg-zinc-800"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                />
                <Button onClick={send} disabled={!compose.trim()} className="rounded-full h-10 w-10 p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
