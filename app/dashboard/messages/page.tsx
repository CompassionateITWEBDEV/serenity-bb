"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Phone, Video, Send, Image as ImageIcon, Camera, Mic,
  MessageCircle, Search, Plus, X, Maximize2, Minimize2, MicOff, VideoOff,
  Volume2, VolumeX, Clock, MonitorUp, MonitorX, Users
} from "lucide-react";
import Swal from "sweetalert2";
import MessageMedia, { MessageMeta } from "@/components/chat/MessageMedia";
import { chatUploadToPath } from "@/lib/chat/storage";

// ✅ use the SAME helper everywhere
import {
  ICE_SERVERS,
  sigChannel,
  getSignalChannel,
  ensureSubscribed,
} from "@/lib/chat/rtc";

/* ------------------------------- Types ---------------------------------- */
type ProviderRole = "doctor" | "nurse" | "counselor";
type MessageRow = {
  id: string; conversation_id: string; patient_id: string | null;
  sender_id: string; sender_name: string; sender_role: "patient" | ProviderRole;
  content: string; created_at: string; read: boolean; urgent: boolean;
  meta?: MessageMeta | null; attachment_url?: string | null; attachment_type?: "image" | "audio" | "file" | null;
};
type Conversation = {
  id: string; patient_id: string; provider_id: string;
  provider_name: string | null; provider_role: ProviderRole | null; provider_avatar: string | null;
  last_message: string | null; last_message_at: string | null; created_at: string;
};
type StaffRow = {
  user_id: string; first_name: string | null; last_name: string | null;
  email: string | null; role: string | null; phone?: string | null; avatar_url?: string | null;
};

/* ---------------------------- Utils/helpers ----------------------------- */
function initials(name?: string | null) {
  const s = (name ?? "").trim(); if (!s) return "U";
  return s.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
async function safePlay(el?: HTMLMediaElement | null) { try { await el?.play?.(); } catch {} }

/* ------------------------------ Page (PATIENT) -------------------------- */
export default function DashboardMessagesPage() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<{ blob: Blob; type: "image" | "audio" | "file"; name?: string; previewUrl: string; duration_sec?: number; } | null>(null);
  useEffect(() => () => { if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); }, [draft?.previewUrl]);

  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  // Call state
  const [incomingCall, setIncomingCall] = useState<{ fromName: string; room: string; mode: "audio" | "video" } | null>(null);
  const [showCall, setShowCall] = useState(false);
  const [callRole, setCallRole] = useState<"caller" | "callee">("caller");
  const [callMode, setCallMode] = useState<"audio" | "video">("audio");
  const callRoomRef = useRef<string | null>(null);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  // Realtime signaling — single, canonical channel per conversation
  const callChRef = useRef<ReturnType<typeof sigChannel> | null>(null);

  // Sidebar tab
  const [sidebarTab, setSidebarTab] = useState<"convs" | "staff">("convs");

  /* ------------------------- Auth ------------------------ */
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) { location.href = "/login"; return; }
      const { data: p } = await supabase
        .from("patients").select("user_id, first_name, last_name, email")
        .eq("user_id", uid).maybeSingle();
      if (!p?.user_id) { await Swal.fire("Access denied", "This page is for patients.", "error"); location.href = "/"; return; }
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || au.user?.email || "Me";
      setMe({ id: uid, name }); setLoading(false);
    })();
  }, []);

  /* ------------------------ Load convos ------------------ */
  const reloadConversations = useCallback(async (patientId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
      .eq("patient_id", patientId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) { await Swal.fire("Load error", error.message, "error"); return; }
    setConvs((data as Conversation[]) || []);
  }, []);
  useEffect(() => { if (me?.id) void reloadConversations(me.id); }, [me?.id, reloadConversations]);

  /* ----------------------------- Staff dir ------------------------- */
  const fetchStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("user_id, first_name, last_name, email, role, phone, avatar_url")
      .order("first_name", { ascending: true });
    if (error) { await Swal.fire("Load error", error.message, "error"); return; }
    setStaffDir((data as StaffRow[]) || []);
  }, []);
  useEffect(() => { if (me) void fetchStaff(); }, [me, fetchStaff]);

  /* --------- Thread + signaling subscribe ----------- */
  useEffect(() => {
    if (!selectedId || !me) return;
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) { await Swal.fire("Load error", error.message, "error"); return; }
      if (alive) {
        setMsgs((data as MessageRow[]) || []);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight }));
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`, { config: { presence: { key: me.id } } })
      .on("postgres_changes",
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as MessageRow]);
          requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" }));
        }
      );
    void ch.subscribe();

    const ping = () => { try { ch.track({ user_id: me.id, at: Date.now() }); } catch {} };
    const keepAlive = setInterval(ping, 1500); ping();

    // ✅ signaling: single canonical room == conversationId
    (async () => {
      callChRef.current = await getSignalChannel(callChRef as any, selectedId, true);
      callChRef.current
        .on("broadcast", { event: "ring" }, (p) => {
          const { room, fromName, mode } = (p.payload || {}) as { room: string; fromName: string; mode: "audio" | "video" };
          if (room !== selectedId) return;
          setIncomingCall({ room, fromName: fromName || "Caller", mode: mode || "audio" });
          playRing(true);
        })
        .on("broadcast", { event: "hangup" }, (p) => {
          const { room } = (p.payload || {}) as any;
          if (room && room !== selectedId) return;
          stopRing(); setIncomingCall(null);
        })
        .on("broadcast", { event: "answered" }, () => stopRing());
    })().catch(() => {});

    return () => {
      alive = false;
      clearInterval(keepAlive);
      try { supabase.removeChannel(ch); } catch {}
      try { if (callChRef.current) supabase.removeChannel(callChRef.current); } catch {}
      callChRef.current = null;
      stopRing();
    };
  }, [selectedId, me]);

  /* --------------------------------- STAFF → CONVERSATION -------------------------------- */
  async function ensureConversationWith(providerUserId: string) {
    if (!me?.id) return;
    const staff = staffDir.find((s) => s.user_id === providerUserId);
    const provider_name = [staff?.first_name, staff?.last_name].filter(Boolean).join(" ") || staff?.email || "Staff";

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("patient_id", me.id)
      .eq("provider_id", providerUserId)
      .maybeSingle();
    if (existing?.id) {
      setSelectedId(existing.id);
      setSidebarTab("convs");
      return;
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .upsert(
        {
          patient_id: me.id,
          provider_id: providerUserId,
          provider_name,
          provider_role: (staff?.role as ProviderRole | null) ?? null,
          provider_avatar: staff?.avatar_url ?? null,
          last_message: null,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "patient_id,provider_id" }
      )
      .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
      .single();

    if (error) { await Swal.fire("Cannot start chat", error.message, "error"); return; }

    const newConv: Conversation = created as any;
    setConvs((prev) => (prev.some((c) => c.id === newConv.id) ? prev : [newConv, ...prev]));
    setSelectedId(newConv.id);
    setSidebarTab("convs");
  }

  /* ------------------------------ PICKERS/REC ---------------------------- */
  function openFilePicker() { fileInputRef.current?.click(); }
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { await Swal.fire("Too large", "Please choose a file under 10 MB.", "info"); return; }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }
  async function takePhoto() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      (video as any).muted = true;
      video.srcObject = stream as any; await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = (video as any).videoWidth || 640; canvas.height = (video as any).videoHeight || 480;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No photo"))), "image/jpeg", 0.9)!);
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (err: any) { await Swal.fire("Camera error", err?.message || "Cannot access camera.", "error"); }
    finally { stream?.getTracks().forEach((t) => t.stop()); }
  }
  async function toggleRecord() {
    if (recording) { mediaRecRef.current?.stop(); return; }
    if (typeof window.MediaRecorder === "undefined") { await Swal.fire("Unsupported", "Voice recording isn’t supported by this browser.", "info"); return; }
    let stream: MediaStream | null = null;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { await Swal.fire("Permission", "Microphone permission denied.", "info"); return; }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
                 MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    chunksRef.current = []; const startedAt = Date.now();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop()); setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setDraft({ blob, type: "audio", name: "voice.webm", previewUrl, duration_sec: duration });
    };
    mediaRecRef.current = rec; setRecording(true); rec.start();
  }

  /* --------------------------------- SEND -------------------------------- */
  const canSend = useMemo(() => (!!compose.trim() || !!draft) && !!me && !!selectedId && !sending, [compose, draft, me, selectedId, sending]);
  async function send() {
    if (!me || !selectedId || !canSend) return;
    setSending(true);
    const caption = compose.trim();
    let meta: MessageMeta | null = null;
    try {
      if (draft) {
        if (draft.type === "image") {
          const path = await chatUploadToPath(draft.blob, { conversationId: selectedId, kind: "image", fileName: draft.name || "image.jpg" });
          meta = { image_path: path, duration_sec: null };
        } else if (draft.type === "audio") {
          const path = await chatUploadToPath(draft.blob, { conversationId: selectedId, kind: "audio", fileName: draft.name || "voice.webm" });
          meta = { audio_path: path, duration_sec: draft.duration_sec ?? null };
        } else meta = {};
      }
    } catch (e: any) { await Swal.fire("Upload failed", e.message || "Could not upload media.", "error"); setSending(false); return; }
    const content = caption || (meta?.audio_path ? "(voice note)" : meta?.image_path ? "(image)" : "");
    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId, patient_id: me.id, sender_id: me.id, sender_name: me.name, sender_role: "patient",
      content, read: false, urgent: false, meta,
    });
    if (insErr) { await Swal.fire("Send failed", insErr.message, "error"); setSending(false); return; }
    setCompose(""); if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); setDraft(null);
    await supabase.from("conversations").update({ last_message: content || "", last_message_at: new Date().toISOString() }).eq("id", selectedId);
    setSending(false);
  }

  /* ------------------------------ CALLING -------------------------------- */
  const selectedConv = useMemo(() => convs.find((c) => c.id === selectedId) || null, [convs, selectedId]);
  const providerInfo = useMemo(() => {
    const s = staffDir.find((x) => x.user_id === selectedConv?.provider_id);
    const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
    return { name, avatar: s?.avatar_url ?? undefined };
  }, [staffDir, selectedConv?.provider_id]);

  function playRing(loop = true) {
    try {
      if (!ringAudioRef.current) {
        const a = new Audio("/ring.mp3"); a.loop = loop; ringAudioRef.current = a;
      }
      ringAudioRef.current.currentTime = 0; ringAudioRef.current.play().catch(() => {});
    } catch {}
  }
  function stopRing() { try { ringAudioRef.current?.pause(); if (ringAudioRef.current) ringAudioRef.current.currentTime = 0; } catch {} }

  async function startCall(mode: "audio" | "video") {
    if (!selectedId || !me) { Swal.fire("Select a chat", "Open a conversation first.", "info"); return; }
    try {
      const ch = await getSignalChannel(chanRef as any, conversationId, false); // <-- don't receive your own broadcasts
chanRef.current = ch;
      callRoomRef.current = room;
      setCallRole("caller"); setCallMode(mode); setShowCall(true); playRing(true);
      await ch.send({ type: "broadcast", event: "ring", payload: { room, fromName: me.name, mode } });
    } catch (e: any) { await Swal.fire("Call failed", e?.message || "Signaling not ready.", "error"); }
  }
  function acceptIncoming(room: string, mode: "audio" | "video") {
    callRoomRef.current = room; setCallRole("callee"); setCallMode(mode); setIncomingCall(null); stopRing();
    try { callChRef.current?.send({ type: "broadcast", event: "answered", payload: { room } }); } catch {}
    setShowCall(true);
  }
  function declineIncoming() {
    setIncomingCall(null); stopRing();
    try { callChRef.current?.send({ type: "broadcast", event: "hangup", payload: { room: selectedId } }); } catch {}
  }

  /* ------------------------------ Lists / filters ------------------------------ */
  const search = q.trim().toLowerCase();

  const convsSorted = useMemo(
    () => [...convs].sort((a, b) => (b.last_message_at || b.created_at || "").localeCompare(a.last_message_at || a.created_at || "")),
    [convs]
  );
  const filteredConvs = useMemo(
    () => convsSorted.filter((c) => {
      const s = staffDir.find((x) => x.user_id === c.provider_id);
      const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
      return search ? name.toLowerCase().includes(search) : true;
    }),
    [convsSorted, staffDir, search]
  );
  const filteredStaff = useMemo(
    () => (search ? staffDir.filter((s) => {
      const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "";
      return name.toLowerCase().includes(search) || (s.role || "").toLowerCase().includes(search);
    }) : staffDir),
    [staffDir, search]
  );

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Chat with your care team</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setSidebarTab("staff")} title="Start a new chat">
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="min-h-0 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          <div className="p-4 border-b dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5" />
              <div className="font-medium">Conversations</div>
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant={sidebarTab === "convs" ? "default" : "outline"}
                  onClick={() => setSidebarTab("convs")}
                >
                  Chats
                </Button>
                <Button
                  size="sm"
                  variant={sidebarTab === "staff" ? "default" : "outline"}
                  onClick={() => setSidebarTab("staff")}
                >
                  <Users className="mr-1 h-4 w-4" /> Staff
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder={sidebarTab === "convs" ? "Search conversations…" : "Search staff…"} className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y dark:divide-zinc-800">
            {sidebarTab === "convs" ? (
              filteredConvs.map((c) => {
                const s = staffDir.find((x) => x.user_id === c.provider_id);
                const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
                const avatar = s?.avatar_url ?? undefined;
                const active = selectedId === c.id;
                return (
                  <button
                    key={`conv-${c.id}`}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 flex items-center gap-3 border-l-4 ${active ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-900/10" : "border-transparent"}`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatar} />
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate font-medium">{name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(c.last_message_at ?? c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{c.provider_role ?? "staff"}</Badge>
                        <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              filteredStaff.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Staff";
                return (
                  <button
                    key={`staff-${s.user_id}`}
                    onClick={() => ensureConversationWith(s.user_id)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 flex items-center gap-3"
                    title={`Chat with ${name}`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={s.avatar_url || undefined} />
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate font-medium">{name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{s.role || "staff"}</Badge>
                        <p className="truncate text-xs text-gray-500">{s.email}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            {sidebarTab === "convs" && filteredConvs.length === 0 && <div className="p-4 text-sm text-gray-500">No conversations yet.</div>}
            {sidebarTab === "staff" && filteredStaff.length === 0 && <div className="p-4 text-sm text-gray-500">No staff found.</div>}
          </div>
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 min-h-0 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <div className="text-lg font-medium">Select a conversation or pick a staff to start</div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b dark:border-zinc-800 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} className="rounded-full lg:hidden">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={providerInfo.avatar} />
                  <AvatarFallback>{initials(providerInfo.name)}</AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="font-semibold">{providerInfo.name}</div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => startCall("audio")} title="Start audio call">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => startCall("video")} title="Start video call">
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {incomingCall && (
                <div className="mx-4 mt-3 rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100 flex items-center gap-3">
                  <span>{incomingCall.mode === "audio" ? "📞" : "📹"} Incoming {incomingCall.mode} call from <b>{incomingCall.fromName}</b></span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" onClick={() => acceptIncoming(incomingCall.room, incomingCall.mode)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={declineIncoming}>Decline</Button>
                  </div>
                </div>
              )}

              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                {msgs.map((m) => {
                  const own = m.sender_id === me?.id;
                  const bubble = own ? "bg-cyan-500 text-white rounded-2xl px-4 py-2 shadow-sm"
                    : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-2 ring-1 ring-gray-200/60 dark:ring-zinc-700/60";
                  const t = (m.content || "").trim().toLowerCase();
                  const showText = !(t === "(image)" || t === "(photo)" || t === "(voice note)");
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%]">
                        <div className={bubble}>
                          <MessageMedia meta={m.meta} attachment_type={m.attachment_type} attachment_url={m.attachment_url} />
                          {showText && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                          <div className={`mt-1 text-[11px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {msgs.length === 0 && <div className="text-sm text-gray-500 text-center py-6">No messages yet.</div>}
              </div>

              <div className="border-t dark:border-zinc-800 p-3">
                {draft && (
                  <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border bg-white p-2 pr-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="max-h-20 max-w-[180px] overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-zinc-700">
                      {draft.type === "image" && <img src={draft.previewUrl} alt="preview" className="h-20 w-auto object-cover" />}
                      {draft.type === "audio" && <audio controls src={draft.previewUrl} className="h-10 w-[180px]" />}
                      {draft.type === "file"  && <div className="p-3">📎 {draft.name || "file"}</div>}
                    </div>
                    <button type="button" className="ml-auto rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      onClick={() => { if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl); setDraft(null); }} aria-label="Remove attachment">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={openFilePicker} className="rounded-full"><ImageIcon className="h-5 w-5" /></Button>
                    <input ref={fileInputRef} type="file" hidden accept="image/*,audio/*" onChange={onPickFile} />
                    <Button type="button" variant="ghost" size="icon" onClick={takePhoto} className="rounded-full"><Camera className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={toggleRecord} className={`rounded-full ${recording ? "animate-pulse" : ""}`}><Mic className="h-5 w-5" /></Button>
                  </div>
                  <Textarea placeholder="Type your message…" value={compose} onChange={(e) => setCompose(e.target.value)}
                    className="min-h-[44px] max-h-[140px] flex-1 rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
                  <Button onClick={send} disabled={!canSend} className="shrink-0 rounded-2xl h-11 px-4 shadow-md" aria-busy={sending}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CALL UI */}
      <CallModal
        open={showCall}
        onClose={() => {
          setShowCall(false);
          stopRing();
          try { callChRef.current?.send({ type: "broadcast", event: "hangup", payload: { room: selectedId } }); } catch {}
        }}
        role={callRole}
        conversationId={selectedId || ""}
        roomId={callRoomRef.current || ""}
        mode={callMode}
        peerName={providerInfo.name}
        peerAvatar={providerInfo.avatar}
      />
    </div>
  );
}

/* ------------------------------- Call Modal ------------------------------ */
type CallUIState = "max" | "window" | "mini";

function CallModal({
  open, onClose, role, conversationId, roomId, mode, peerName, peerAvatar,
}: {
  open: boolean; onClose: () => void; role: "caller" | "callee";
  conversationId: string; roomId: string; mode: "audio" | "video";
  peerName: string; peerAvatar?: string;
}) {
  const [ui, setUi] = useState<CallUIState>("max");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [speakerOn, setSpeakerOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 920, h: 600 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ w0: number; h0: number; x0: number; y0: number } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const chanRef = useRef<ReturnType<typeof sigChannel> | null>(null);
  const timerRef = useRef<number | null>(null);

  const pcInit: RTCConfiguration = ICE_SERVERS;

  useEffect(() => {
    if (!open) return;
    timerRef.current = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setElapsedSec(0); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") setMicOn((v) => { streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !v)); return !v; });
      if (e.key.toLowerCase() === "c") setCamOn((v) => { streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !v)); return !v; });
      if (e.key.toLowerCase() === "s") void toggleShare();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !conversationId || !roomId) return;
    let ended = false;

    async function setup() {
      // PeerConnection
      const pc = new RTCPeerConnection(pcInit);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => console.log("[webrtc] ice:", pc.iceConnectionState);
      pc.onconnectionstatechange = () => console.log("[webrtc] pc:", pc.connectionState);

      pc.ontrack = async (e) => {
        const [remote] = e.streams;
        if (!remote) return;
        if (mode === "video") {
          const v = remoteVideoRef.current;
          if (v) { v.srcObject = remote; v.muted = !speakerOn; v.playsInline = true; v.autoplay = true; await safePlay(v); }
        } else {
          const a = remoteAudioRef.current;
          if (a) { a.srcObject = remote; a.muted = !speakerOn; a.autoplay = true; await safePlay(a); }
        }
      };

      pc.onicecandidate = async (e) => {
        if (e.candidate && chanRef.current) {
          await chanRef.current.send({ type: "broadcast", event: "ice", payload: { room: roomId, candidate: e.candidate } });
        }
      };

      // Local media
      streamRef.current = await navigator.mediaDevices.getUserMedia(mode === "video" ? { video: true, audio: true } : { audio: true, video: false });
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = micOn));
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = camOn));
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));

      if (mode === "video") {
        if (localVideoRef.current) { localVideoRef.current.muted = true; localVideoRef.current.srcObject = streamRef.current; await safePlay(localVideoRef.current); }
      } else {
        if (localAudioRef.current) { localAudioRef.current.srcObject = streamRef.current; await safePlay(localAudioRef.current); }
      }

      // Signaling
      const ch = await getSignalChannel(chanRef as any, conversationId, true);
      chanRef.current = ch;

      ch
  .on("broadcast", { event: "offer" }, async (p) => {
    if (role === "caller") return;            // caller must NOT handle own offer
    const { room, sdp } = p.payload as any;
    if (room !== roomId || !pcRef.current) return;

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    await ch.send({ type: "broadcast", event: "answer", payload: { room: roomId, sdp: answer } });
  })
  .on("broadcast", { event: "answer" }, async (p) => {
    if (role === "callee") return;            // callee must NOT handle answer
    const { room, sdp } = p.payload as any;
    if (room !== roomId || !pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
  });

      await ensureSubscribed(ch);

      // Offer (caller)
      if (role === "caller") {
        if (mode === "video") {
          pc.addTransceiver("video", { direction: "sendrecv" });
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } else {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        }
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video",
        });
        await pc.setLocalDescription(offer);
        await ch.send({ type: "broadcast", event: "offer", payload: { room: roomId, sdp: offer } });
      }
    }

    function cleanup() {
      ended = true;
      try { chanRef.current && supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
      try { screenRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      screenRef.current = null;
      try { pcRef.current?.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} }); } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      streamRef.current = null;
      onClose();
    }

    setup();
    return () => { if (!ended) cleanup(); };
  }, [open, role, conversationId, roomId, onClose, mode, micOn, camOn, speakerOn]);

  async function toggleShare() {
    if (mode !== "video") return;
    if (sharing) {
      try { screenRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      screenRef.current = null; setSharing(false);
      const v = streamRef.current?.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (sender && v) await sender.replaceTrack(v);
      return;
    }
    try {
      const scr = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      screenRef.current = scr; setSharing(true);
      const track = scr.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (sender && track) await sender.replaceTrack(track);
      scr.getVideoTracks()[0].onended = async () => {
        setSharing(false);
        const v = streamRef.current?.getVideoTracks()[0];
        if (sender && v) await sender.replaceTrack(v);
      };
    } catch {}
  }

  function headerDown(e: React.PointerEvent) {
    if (ui === "max") return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function headerMove(e: React.PointerEvent) {
    if (!dragRef.current || ui === "max") return;
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({ x: clamp(e.clientX - dragRef.current.dx, 0, vw - size.w), y: clamp(e.clientY - dragRef.current.dy, 0, vh - size.h) });
  }
  function headerUp(e: React.PointerEvent) {
    if (!dragRef.current) return; dragRef.current = null; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }
  function resizeDown(e: React.PointerEvent) {
    if (ui !== "window") return;
    resizeRef.current = { w0: size.w, h0: size.h, x0: e.clientX, y0: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function resizeMove(e: React.PointerEvent) {
    const st = resizeRef.current; if (!st || ui !== "window") return;
    const vw = window.innerWidth, vh = window.innerHeight;
    setSize({
      w: clamp(st.w0 + (e.clientX - st.x0), 540, vw - pos.x - 8),
      h: clamp(st.h0 + (e.clientY - st.y0), 360, vh - pos.y - 8),
    });
  }
  function resizeUp(e: React.PointerEvent) {
    if (!resizeRef.current) return; resizeRef.current = null; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  const hhmmss = useMemo(() => {
    const s = elapsedSec; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return [h, m, ss].map((n) => String(n).padStart(2, "0")).join(":");
  }, [elapsedSec]);

  if (!open) return null;

  const styleMax = { inset: 0 as any };
  const styleWin = { top: pos.y, left: pos.x, width: size.w, height: size.h } as any;
  const styleMini = { bottom: 16, right: 16, width: 280, height: 158 } as any;

  return (
    <>
      {ui !== "mini" && <div className="fixed inset-0 z-[60] bg-black/50" />}

      <div
        className={`fixed z-[70] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl ${ui === "max" ? "inset-0" : ""}`}
        style={ui === "max" ? styleMax : ui === "window" ? styleWin : styleMini}
        role="dialog" aria-modal="true"
      >
        <div
          className={`flex items-center gap-3 border-b dark:border-zinc-800 px-3 py-2 select-none ${ui !== "max" ? "cursor-default" : ""}`}
          onDoubleClick={() => setUi((s) => (s === "max" ? "window" : "max"))}
          onPointerDown={headerDown}
          onPointerMove={headerMove}
          onPointerUp={headerUp}
        >
          <Avatar className="h-6 w-6"><AvatarImage src={peerAvatar} /><AvatarFallback>{initials(peerName)}</AvatarFallback></Avatar>
          <div className="text-sm font-medium">{peerName}</div>
          <div className="ml-2 flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> <span className="tabular-nums">{hhmmss}</span></div>
          <div className="ml-auto flex items-center gap-1">
            {ui !== "mini" && (
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setUi((s) => (s === "max" ? "window" : "max"))} title={ui === "max" ? "Restore down" : "Maximize"}>
                {ui === "max" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setUi("mini")} title="Minimize to bubble">Mini</Button>
            <Button size="sm" variant="destructive" onClick={() => {
              try { chanRef.current?.send({ type: "broadcast", event: "hangup", payload: { room: roomId } }); } catch {}
              onClose();
            }}>End</Button>
          </div>
        </div>

        <div className={`${ui === "max" ? "h-[calc(100vh-48px)]" : "h-[calc(100%-44px)]"} relative`}>
          {mode === "video" ? (
            <div className="absolute inset-0 grid place-items-center">
              <video ref={remoteVideoRef} autoPlay playsInline muted={!speakerOn} className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 w-40 h-28 rounded-lg ring-1 ring-white/50 bg-black object-cover" />
            </div>
          ) : (
            <div className="absolute inset-0 grid grid-cols-2 gap-3 p-3">
              <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">You (mic {micOn ? "on" : "off"})</div>
                <audio ref={localAudioRef} autoPlay muted />
              </div>
              <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">Peer</div>
                <audio ref={remoteAudioRef} autoPlay muted={!speakerOn} />
              </div>
            </div>
          )}

          <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-1 shadow-lg border dark:border-zinc-700">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
              setSpeakerOn((v) => {
                const next = !v;
                if (remoteAudioRef.current) { remoteAudioRef.current.muted = !next; safePlay(remoteAudioRef.current); }
                if (remoteVideoRef.current) { remoteVideoRef.current.muted = !next; safePlay(remoteVideoRef.current); }
                return next;
              });
            }}>
              {speakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
              streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn)); setMicOn(!micOn);
            }} title="Mic (M)">
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            {mode === "video" && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
                streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn)); setCamOn(!camOn);
              }} title="Camera (C)">
                {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
            )}
            {mode === "video" && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={toggleShare} title="Share screen (S)">
                {sharing ? <MonitorX className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
              </Button>
            )}
            <Button size="sm" variant="destructive" className="rounded-full" onClick={() => {
              try { chanRef.current?.send({ type: "broadcast", event: "hangup", payload: { room: roomId } }); } catch {}
              onClose();
            }}>End</Button>
          </div>

          {ui === "window" && (
            <div className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize opacity-60"
              onPointerDown={resizeDown} onPointerMove={resizeMove} onPointerUp={resizeUp} />
          )}
        </div>
      </div>

      {ui === "mini" && (<MiniBubble onClick={() => setUi("window")} onClose={onClose} peerAvatar={peerAvatar} name={peerName} />)}
    </>
  );
}

/* ---------------------------- Mini Bubble ---------------------------- */
function MiniBubble({ onClick, onClose, peerAvatar, name }: { onClick: () => void; onClose: () => void; peerAvatar?: string; name: string; }) {
  const [p, setP] = useState({ x: typeof window !== "undefined" ? window.innerWidth - 96 - 12 : 12, y: typeof window !== "undefined" ? window.innerHeight - 96 - 12 : 12 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  function down(e: React.PointerEvent) {
    dragRef.current = { dx: e.clientX - p.x, dy: e.clientY - p.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const nx = clamp(e.clientX - dragRef.current.dx, 8, window.innerWidth - 96 - 8);
    const ny = clamp(e.clientY - dragRef.current.dy, 8, window.innerHeight - 96 - 8);
    setP({ x: nx, y: ny });
  }
  function up(e: React.PointerEvent) {
    if (!dragRef.current) return;
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  const pendingICE: RTCIceCandidateInit[] = [];

ch.on("broadcast", { event: "ice" }, async (p) => {
  const { room, candidate } = p.payload as any;
  if (room !== roomId || !pcRef.current) return;

  if (!pcRef.current.remoteDescription) {
    pendingICE.push(candidate);
  } else {
    try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
  }
});

// After you set remote description (in both offer & answer paths):
for (const c of pendingICE.splice(0)) {
  try { await pcRef.current!.addIceCandidate(new RTCIceCandidate(c)); } catch {}
}
  return (
    <div className="fixed z-[80]" style={{ left: p.x, top: p.y, width: 96, height: 96 }}>
      <button
        className="relative h-24 w-24 rounded-full ring-2 ring-white/80 shadow-lg overflow-hidden bg-white"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={onClick} onClick={onClick}
        title={`Back to call with ${name}`}
      >
        {peerAvatar ? <img src={peerAvatar} alt="" className="absolute inset-0 h-full w-full object-cover" /> :
          <div className="absolute inset-0 grid place-items-center bg-gray-100 text-gray-700 text-xl">{initials(name)}</div>}
        <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">●</span>
      </button>
      <button className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white shadow ring-1 ring-gray-200 text-xs" onClick={onClose}>✕</button>
    </div>
  );
}
