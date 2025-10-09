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
  MessageCircle, Search, Plus, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Swal from "sweetalert2";
import MessageMedia, { MessageMeta } from "@/components/chat/MessageMedia";
import { chatUploadToPath } from "@/lib/chat/storage";

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

  meta?: MessageMeta | null;                 // new schema
  attachment_url?: string | null;            // legacy
  attachment_type?: "image" | "audio" | "file" | null; // legacy
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
  role: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

/* ---------------------------- Utils/helpers ----------------------------- */
function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  return s.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function sanitizePhone(n?: string | null) {
  return (n ?? "").replace(/[^\d+]/g, "");
}

/* ------------------------------ Page (PATIENT) -------------------------- */
export default function DashboardMessagesPage() {
  // patient identity only
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

  // Draft media (staged before sending)
  const [draft, setDraft] = useState<{
    blob: Blob;
    type: "image" | "audio" | "file";
    name?: string;
    previewUrl: string;
    duration_sec?: number;
  } | null>(null);
  useEffect(() => () => { if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); }, [draft?.previewUrl]);

  // recording
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // sending lock
  const [sending, setSending] = useState(false);

  // call state + ringing
  const [incomingCall, setIncomingCall] = useState<{ fromName: string; room: string } | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoRole, setVideoRole] = useState<"caller" | "callee">("caller");
  const videoRoomRef = useRef<string | null>(null);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  /* ------------------------- Auth + ensure PATIENT ------------------------ */
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) { location.href = "/login"; return; }

      const { data: p } = await supabase
        .from("patients")
        .select("user_id, first_name, last_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      if (!p?.user_id) {
        await Swal.fire("Access denied", "This page is for patients.", "error");
        location.href = "/";
        return;
      }

      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || au.user?.email || "Me";
      setMe({ id: uid, name });
      setLoading(false);
    })();
  }, []);

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
    })();
  }, [me]);

  /* ----------------------------- Staff directory ------------------------- */
  const fetchStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("user_id, first_name, last_name, email, role, phone, avatar_url");
    if (error) { await Swal.fire("Load error", error.message, "error"); return; }
    setStaffDir((data as StaffRow[]) || []);
  }, []);
  useEffect(() => { if (me) void fetchStaff(); }, [me, fetchStaff]);

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
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight }));
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`, { config: { presence: { key: me.id } } })
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as MessageRow]); // realtime only → no doubles
          requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" }));
        }
      )
      .subscribe();

    // Simple presence hint (optional)
    const ping = () => {
      try { ch.track({ user_id: me.id, at: Date.now() }); } catch {}
    };
    const keepAlive = setInterval(ping, 1500); ping();

    // Video signaling + ringing
    const videoCh = supabase
      .channel(`video_${selectedId}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "ring" }, (p) => {
        const { room, fromName } = (p.payload || {}) as { room: string; fromName: string };
        setIncomingCall({ room, fromName: fromName || "Caller" });
        playRing(true);
      })
      .on("broadcast", { event: "hangup" }, () => {
        stopRing();
        setIncomingCall(null);
      })
      .on("broadcast", { event: "answered" }, () => {
        stopRing();
      })
      .subscribe();

    return () => {
      alive = false;
      clearInterval(keepAlive);
      try { supabase.removeChannel(ch); } catch {}
      try { supabase.removeChannel(videoCh); } catch {}
      stopRing();
    };
  }, [selectedId, me]);

  /* ------------------------------ PICKERS -------------------------------- */
  function openFilePicker() { fileInputRef.current?.click(); }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      await Swal.fire("Too large", "Please choose a file under 10 MB.", "info");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" =
      file.type.startsWith("image/") ? "image" :
      file.type.startsWith("audio/") ? "audio" : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }

  async function takePhoto() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream as any; await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("No photo"))), "image/jpeg", 0.9)!
      );
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (err: any) {
      await Swal.fire("Camera error", err?.message || "Cannot access camera.", "error");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }

  async function toggleRecord() {
    if (recording) { mediaRecRef.current?.stop(); return; }
    if (typeof window.MediaRecorder === "undefined") {
      await Swal.fire("Unsupported", "Voice recording isn’t supported by this browser.", "info");
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      await Swal.fire("Permission", "Microphone permission denied.", "info");
      return;
    }
    const mime =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
      MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    chunksRef.current = [];
    const startedAt = Date.now();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setDraft({ blob, type: "audio", name: "voice.webm", previewUrl, duration_sec: duration });
    };
    mediaRecRef.current = rec;
    setRecording(true);
    rec.start(); // user stops
  }

  /* --------------------------------- SEND -------------------------------- */
  const canSend = useMemo(
    () => (!!compose.trim() || !!draft) && !!me && !!selectedId && !sending,
    [compose, draft, me, selectedId, sending]
  );

  async function send() {
    if (!me || !selectedId || !canSend) return;
    setSending(true);
    const caption = compose.trim();

    let meta: MessageMeta | null = null;
    try {
      if (draft) {
        if (draft.type === "image") {
          const path = await chatUploadToPath(draft.blob, {
            conversationId: selectedId,
            kind: "image",
            fileName: draft.name || "image.jpg",
          });
          meta = { image_path: path, duration_sec: null };
        } else if (draft.type === "audio") {
          const path = await chatUploadToPath(draft.blob, {
            conversationId: selectedId,
            kind: "audio",
            fileName: draft.name || "voice.webm",
          });
          meta = { audio_path: path, duration_sec: draft.duration_sec ?? null };
        } else {
          meta = {};
        }
      }
    } catch (e: any) {
      await Swal.fire("Upload failed", e.message || "Could not upload media.", "error");
      setSending(false);
      return;
    }

    const content = caption || (meta?.audio_path ? "(voice note)" : meta?.image_path ? "(image)" : "");

    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: me.id, // patient sender
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content,
      read: false,
      urgent: false,
      meta,
    });

    if (insErr) {
      await Swal.fire("Send failed", insErr.message, "error");
      setSending(false);
      return;
    }

    setCompose("");
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);

    await supabase
      .from("conversations")
      .update({ last_message: content || "", last_message_at: new Date().toISOString() })
      .eq("id", selectedId);

    setSending(false);
  }

  /* ------------------------------ CALLING -------------------------------- */
  const selectedConv = useMemo(
    () => convs.find((c) => c.id === selectedId) || null,
    [convs, selectedId]
  );

  const providerInfo = useMemo(() => {
    const s = staffDir.find((x) => x.user_id === selectedConv?.provider_id);
    const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
    return { name, avatar: s?.avatar_url ?? undefined, phone: sanitizePhone(s?.phone || null) };
  }, [staffDir, selectedConv?.provider_id]);

  function playRing(loop = true) {
    try {
      if (!ringAudioRef.current) {
        // small embedded ding; replace with your /public/ring.mp3 if desired
        const a = new Audio(
          "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA..."
        );
        a.loop = loop;
        ringAudioRef.current = a;
      }
      ringAudioRef.current.currentTime = 0;
      void ringAudioRef.current.play();
    } catch {}
  }
  function stopRing() {
    try {
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
    } catch {}
  }

  function startPhoneCall() {
    if (!selectedId) { Swal.fire("Select a chat", "Open a conversation first.", "info"); return; }
    if (!providerInfo.phone) { Swal.fire("No phone", "No phone number on file for this provider.", "info"); return; }
    playRing(false);
    try { window.location.href = `tel:${providerInfo.phone}`; } finally { setTimeout(stopRing, 1500); }
  }

  async function startVideoCall() {
    if (!selectedId || !me) { Swal.fire("Select a chat", "Open a conversation first.", "info"); return; }
    const room = `${selectedId}`;
    videoRoomRef.current = room;
    setVideoRole("caller");
    setShowVideo(true);
    playRing(true);
    try {
      await supabase.channel(`video_${selectedId}`, { config: { broadcast: { self: true } } })
        .send({ type: "broadcast", event: "ring", payload: { room, fromName: me.name } });
    } catch {}
  }

  function acceptVideoCall(room: string) {
    videoRoomRef.current = room;
    setVideoRole("callee");
    setIncomingCall(null);
    stopRing();
    void supabase.channel(`video_${selectedId}`, { config: { broadcast: { self: true } } })
      .send({ type: "broadcast", event: "answered", payload: { room } });
    setShowVideo(true);
  }

  function declineVideoCall() {
    setIncomingCall(null);
    stopRing();
    try {
      if (selectedId) {
        supabase.channel(`video_${selectedId}`, { config: { broadcast: { self: true } } })
          .send({ type: "broadcast", event: "hangup", payload: {} });
      }
    } catch {}
  }

  /* --------------------------------- UI ---------------------------------- */
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

  const filteredConvs = useMemo(() => {
    return convsSorted.filter((c) => {
      const s = staffDir.find((x) => x.user_id === c.provider_id);
      const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
      return search ? name.toLowerCase().includes(search) : true;
    });
  }, [convsSorted, staffDir, search]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Chat with your care team</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1"><Plus className="h-4 w-4" /> New chat</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Start new chat</DialogTitle></DialogHeader>
            {/* Optional: add patient → provider picker here */}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="min-h-0 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          <div className="p-4 border-b dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5" />
              <div className="font-medium">Conversations</div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search staff…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y dark:divide-zinc-800">
            {filteredConvs.map((c) => {
              const s = staffDir.find((x) => x.user_id === c.provider_id);
              const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
              const avatar = s?.avatar_url ?? undefined;
              const active = selectedId === c.id;
              return (
                <button
                  key={`conv-${c.id}`}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 flex items-center gap-3 border-l-4 ${
                    active ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-900/10" : "border-transparent"
                  }`}
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
            })}
          </div>
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 min-h-0 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <div className="text-lg font-medium">Select a conversation</div>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
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
                  <div className="flex items-center gap-1 text-xs">
                    <span className={`inline-block h-2 w-2 rounded-full ${providerOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <span className={providerOnline ? "text-emerald-600" : "text-gray-500"}>{providerOnline ? "Online" : "Offline"}</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={startPhoneCall} title={providerInfo.phone ? `Call ${providerInfo.phone}` : "No phone on file"}>
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={startVideoCall} title="Start video call">
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Incoming call banner */}
              {incomingCall && (
                <div className="mx-4 mt-3 rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100 flex items-center gap-3">
                  <span>📹 Incoming call from <b>{incomingCall.fromName}</b></span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" onClick={() => acceptVideoCall(incomingCall.room)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={declineVideoCall}>Decline</Button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                {msgs.map((m) => {
                  const own = m.sender_id === me?.id;
                  const bubble = own
                    ? "bg-cyan-500 text-white rounded-2xl px-4 py-2 shadow-sm"
                    : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-2 ring-1 ring-gray-200/60 dark:ring-zinc-700/60";
                  const showText = (() => {
                    const t = (m.content || "").trim().toLowerCase();
                    const isPh = t === "(image)" || t === "(photo)" || t === "(voice note)";
                    return !isPh;
                  })();
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%]">
                        <div className={bubble}>
                          <MessageMedia
                            meta={m.meta}
                            attachment_type={m.attachment_type}
                            attachment_url={m.attachment_url}
                          />
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

              {/* Composer */}
              <div className="border-t dark:border-zinc-800 p-3">
                {draft && (
                  <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border bg-white p-2 pr-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="max-h-20 max-w-[180px] overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-zinc-700">
                      {draft.type === "image" && <img src={draft.previewUrl} alt="preview" className="h-20 w-auto object-cover" />}
                      {draft.type === "audio" && <audio controls src={draft.previewUrl} className="h-10 w-[180px]" />}
                      {draft.type === "file"  && <div className="p-3">📎 {draft.name || "file"}</div>}
                    </div>
                    <button
                      type="button"
                      className="ml-auto rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      onClick={() => { if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl); setDraft(null); }}
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={openFilePicker} className="rounded-full">
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <input ref={fileInputRef} type="file" hidden accept="image/*,audio/*" onChange={onPickFile} />
                    <Button type="button" variant="ghost" size="icon" onClick={takePhoto} className="rounded-full">
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={toggleRecord} className={`rounded-full ${recording ? "animate-pulse" : ""}`}>
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Type your message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    className="min-h-[44px] max-h-[140px] flex-1 rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  />
                  <Button onClick={send} disabled={!canSend} className="shrink-0 rounded-2xl h-11 px-4 shadow-md" aria-busy={sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      <VideoCallModal
        open={showVideo}
        onClose={() => {
          setShowVideo(false);
          stopRing();
          try {
            if (selectedId) {
              supabase.channel(`video_${selectedId}`, { config: { broadcast: { self: true } } })
                .send({ type: "broadcast", event: "hangup", payload: {} });
            }
          } catch {}
        }}
        role={videoRole}
        conversationId={selectedId || ""}
        roomId={videoRoomRef.current || ""}
      />
    </div>
  );
}

/* ------------------------------ Video Modal ------------------------------ */
function VideoCallModal({
  open,
  onClose,
  role,
  conversationId,
  roomId,
}: {
  open: boolean;
  onClose: () => void;
  role: "caller" | "callee";
  conversationId: string;
  roomId: string;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const pcInit: RTCConfiguration = useMemo(() => ({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
    ],
  }), []);

  useEffect(() => {
    if (!open || !conversationId || !roomId) return;

    let ended = false;

    async function setup() {
      const pc = new RTCPeerConnection(pcInit);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const [remote] = e.streams;
        if (remoteRef.current) remoteRef.current.srcObject = remote;
      };

      pc.onicecandidate = async (e) => {
        if (e.candidate && chanRef.current) {
          await chanRef.current.send({
            type: "broadcast",
            event: "ice",
            payload: { room: roomId, candidate: e.candidate },
          });
        }
      };

      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));
      if (localRef.current) localRef.current.srcObject = streamRef.current;

      const ch = supabase.channel(`video_${conversationId}`, { config: { broadcast: { self: false } } });
      chanRef.current = ch;

      ch.on("broadcast", { event: "offer" }, async (p) => {
        const { room, sdp } = p.payload as any;
        if (room !== roomId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        await ch.send({ type: "broadcast", event: "answer", payload: { room: roomId, sdp: answer } });
      });

      ch.on("broadcast", { event: "answer" }, async (p) => {
        const { room, sdp } = p.payload as any;
        if (room !== roomId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      ch.on("broadcast", { event: "ice" }, async (p) => {
        const { room, candidate } = p.payload as any;
        if (room !== roomId || !pcRef.current) return;
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      });

      ch.on("broadcast", { event: "hangup" }, () => {
        if (!ended) cleanup();
      });

      await ch.subscribe();

      if (role === "caller") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await ch.send({ type: "broadcast", event: "offer", payload: { room: roomId, sdp: offer } });
      }
    }

    function cleanup() {
      ended = true;
      try { chanRef.current && supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
      try { pcRef.current?.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} }); } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      streamRef.current = null;
      onClose();
    }

    setup();
    return () => { if (!ended) cleanup(); };
  }, [open, role, conversationId, roomId, pcInit, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Video Call</h2>
          <Button size="sm" variant="outline" onClick={onClose}>End</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <video ref={localRef} autoPlay muted playsInline className="h-64 w-full rounded-lg bg-black object-cover" />
          <video ref={remoteRef} autoPlay playsInline className="h-64 w-full rounded-lg bg-black object-cover" />
        </div>
        <p className="mt-2 text-xs text-gray-500">Use a TURN server in production for reliability.</p>
      </div>
    </div>
  );
}
