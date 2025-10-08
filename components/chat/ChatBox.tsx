"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, Image as ImageIcon, Camera, Mic, CheckCheck, X } from "lucide-react";
import type { ProviderRole } from "@/lib/chat";
import { markRead as markReadHelper } from "@/lib/chat";

// NEW: use the shared upload helpers
import { uploadToStorage, sendAttachmentMessage } from "@/lib/chat_upload";

type Provider = ProviderRole;

type MessageRow = {
  id: string;
  conversation_id: string | null;
  patient_id: string | null;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | Provider;
  content: string;                      // text or URL (when type != 'text')
  created_at: string;
  read: boolean;
  urgent: boolean;

  // legacy attachment columns (still supported for reading)
  attachment_url?: string | null;
  attachment_type?: "image" | "audio" | "file" | null;

  // new column
  type?: "text" | "image" | "audio" | null;
};

type UiSettings = {
  theme?: "light" | "dark" | "system";
  density?: "comfortable" | "compact";
  bubbleRadius?: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend?: boolean;
  sound?: boolean;
};

export default function ChatBox(props: {
  mode: "staff" | "patient";
  patientId: string;
  providerId?: string;
  providerName?: string;
  providerRole?: ProviderRole;
  providerAvatarUrl?: string | null;
  patientName?: string | null;
  patientAvatarUrl?: string | null;
  settings?: UiSettings;
  onBack?: () => void;
  phoneHref?: string;
  videoHref?: string;
  conversationId?: string;
}) {
  const {
    mode, patientId, providerId, providerName, providerRole,
    providerAvatarUrl, patientName, patientAvatarUrl,
    settings, onBack, phoneHref, videoHref, conversationId: conversationIdProp,
  } = props;

  const [conversationId, setConversationId] = useState<string | null>(conversationIdProp ?? null);
  const [me, setMe] = useState<{ id: string; name: string; role: "patient" | Provider } | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const [uploading, setUploading] = useState<{ label: string } | null>(null);
  const [recording, setRecording] = useState<boolean>(false);

  const [threadOtherPresent, setThreadOtherPresent] = useState<boolean>(false);
  const [resolvedPatient, setResolvedPatient] = useState<{ name?: string; email?: string; avatar?: string | null } | null>(null);

  // presence states
  const [dbOnline, setDbOnline] = useState<boolean>(false);
  const [rtOnline, setRtOnline] = useState<boolean>(false);
  const [presenceLoading, setPresenceLoading] = useState<boolean>(true);

  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => { setConversationId(conversationIdProp ?? null); }, [conversationIdProp]);

  const bubbleBase =
    (settings?.bubbleRadius ?? "rounded-2xl") +
    " px-4 py-2 " +
    ((settings?.density ?? "comfortable") === "compact" ? "text-sm" : "text-[15px]");

  const ding = useCallback(() => {
    if (!settings?.sound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 920; g.gain.value = 0.001;
      o.connect(g); g.connect(ctx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
      o.stop(ctx.currentTime + 0.12);
    } catch {}
  }, [settings?.sound]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // resolve me / conversation
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id; if (!uid) return;

      if (mode === "staff") {
        const pid = providerId!;
        setMe({ id: pid, name: providerName || "Me", role: providerRole! });
        if (!conversationIdProp) {
          const { data: conv } = await supabase
            .from("conversations").select("id")
            .eq("patient_id", patientId).eq("provider_id", pid).maybeSingle();
          if (conv) setConversationId(conv.id);
          else {
            const { data: created } = await supabase
              .from("conversations")
              .upsert(
                { patient_id: patientId, provider_id: pid, provider_name: providerName ?? null, provider_role: providerRole ?? null },
                { onConflict: "patient_id,provider_id" }
              )
              .select("id").single();
            setConversationId(created!.id);
          }
        }
      } else {
        setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
        if (!conversationIdProp) {
          const { data: conv } = await supabase
            .from("conversations").select("id")
            .eq("patient_id", uid).eq("provider_id", providerId!).maybeSingle();
          if (conv) setConversationId(conv.id);
        }
      }
    })();
  }, [mode, patientId, providerId, providerName, providerRole, conversationIdProp]);

  // load messages
  useLayoutEffect(() => {
    if (!conversationId || !me) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMsgs((data as MessageRow[]) ?? []);
      scrollToBottom(false);
      await markReadHelper(conversationId, me.role);
    })();
  }, [conversationId, me, scrollToBottom]);

  // message/typing realtime
  useEffect(() => {
    if (!conversationId || !me) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const ch = supabase
      .channel(`thread_${conversationId}`, { config: { presence: { key: me.id } } })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState(); const others = Object.entries(state).flatMap(([, v]: any) => v) as any[];
        setTyping(others.some((s) => s.status === "typing"));
        const someoneElse = others.some((s) => s.user_id && s.user_id !== me.id);
        setThreadOtherPresent(someoneElse);
      })
      .on("postgres_changes",
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${conversationId}` },
        async (p) => {
          const row = p.new as MessageRow;
          setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
          scrollToBottom(true);
          if (row.sender_id !== me.id) { ding(); await markReadHelper(conversationId, me.role); }
        })
      .on("postgres_changes",
        { schema: "public", table: "messages", event: "UPDATE", filter: `conversation_id=eq.${conversationId}` },
        async () => {
          const { data } = await supabase
            .from("messages").select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
          setMsgs((data as MessageRow[]) ?? []);
        })
      .subscribe();

    channelRef.current = ch;

    const refetch = async () => {
      const { data } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMsgs((data as MessageRow[]) ?? []);
      await markReadHelper(conversationId, me.role);
    };

    window.addEventListener("focus", refetch);
    window.addEventListener("online", refetch);

    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("online", refetch);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [conversationId, me, ding, scrollToBottom]);

  // typing presence (thread)
  useEffect(() => {
    if (!channelRef.current || !me) return;
    const ch = channelRef.current;
    const t = setInterval(() => { ch.track({ user_id: me.id, status: text ? "typing" : "idle" }); }, 1500);
    ch.track({ user_id: me.id, status: text ? "typing" : "idle" });
    return () => clearInterval(t);
  }, [text, me]);

  // PATIENT heartbeat + RT presence; STAFF presence watcher ... (unchanged)
  // --- snip (keep your full presence code as-is) ---
  // For brevity, I keep the rest of your presence logic identical.
  // Paste your presence hooks here without changes.
  // --- start of unchanged presence code ---
  useEffect(() => {
    if (mode !== "patient") return;
    (async () => {
      const { data } = await supabase.auth.getUser(); const uid = data.user?.id; if (!uid) return;
      const beat = async () => { try { await supabase.rpc("patient_heartbeat"); } catch {} };
      await beat(); const fast = setInterval(beat, 1000); setTimeout(() => clearInterval(fast), 2200);
      const slow = setInterval(beat, 10000);
      const ch = supabase.channel(`online:${uid}`, { config: { presence: { key: uid } } });
      ch.subscribe((status) => { if (status === "SUBSCRIBED") { const ping = () => ch.track({ online: true, at: Date.now() }); ping(); setTimeout(ping, 600); } });
      const onFocus = () => { void beat(); try { ch.track({ online: true, at: Date.now() }); } catch {} };
      const onVis = () => { if (document.visibilityState === "visible") onFocus(); };
      window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onVis);
      return () => { clearInterval(slow); try { supabase.removeChannel(ch); } catch {} window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVis); };
    })();
  }, [mode]);

  useEffect(() => {
    if (mode !== "staff" || !patientId) return;
    let cancelled = false; setPresenceLoading(true);
    const fetchOnce = async () => {
      try { const { data } = await supabase.from("v_patient_online").select("online,last_seen").eq("user_id", patientId).maybeSingle();
        if (!cancelled && data) setDbOnline(!!data.online); } catch {}
    };
    const dbCh = supabase
      .channel(`presence_db_${patientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (p) => { const last = new Date(p.new.last_seen as string).getTime(); setDbOnline(Date.now() - last < 15000); setPresenceLoading(false); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (p) => { const last = new Date(p.new.last_seen as string).getTime(); setDbOnline(Date.now() - last < 15000); setPresenceLoading(false); })
      .subscribe();
    const staffKey = `staff-${crypto.randomUUID()}`;
    const rtCh = supabase.channel(`online:${patientId}`, { config: { presence: { key: staffKey } } });
    const computeRtOnline = () => { const state = rtCh.presenceState() as Record<string, any[]>; const entries = state[patientId] || []; return Array.isArray(entries) && entries.length > 0; };
    const updateRt = () => { setRtOnline(computeRtOnline()); setPresenceLoading(false); };
    rtCh.on("presence", { event: "sync" }, updateRt).on("presence", { event: "join" }, updateRt).on("presence", { event: "leave" }, updateRt)
      .subscribe(async (status) => { if (status === "SUBSCRIBED") { try { await rtCh.track({ observer: true, at: Date.now() }); } catch {} updateRt(); setTimeout(updateRt, 700); } });
    void fetchOnce(); const t1 = setTimeout(fetchOnce, 600);
    const refetchPresence = () => { void fetchOnce(); updateRt(); };
    const onVis = () => { if (document.visibilityState === "visible") refetchPresence(); };
    window.addEventListener("focus", refetchPresence); window.addEventListener("online", refetchPresence); document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; clearTimeout(t1); try { supabase.removeChannel(dbCh); } catch {} try { supabase.removeChannel(rtCh); } catch {} window.removeEventListener("focus", refetchPresence); window.removeEventListener("online", refetchPresence); document.removeEventListener("visibilitychange", onVis); };
  }, [mode, patientId]);
  // --- end of unchanged presence code ---

  // resolve patient profile for header
  useEffect(() => {
    if (mode !== "staff" || !patientId) return;
    let cancelled = false;
    (async () => {
      const p1 = await supabase.from("patients").select("full_name, email, avatar").eq("user_id", patientId).maybeSingle();
      if (!cancelled && p1.data) { setResolvedPatient({ name: p1.data.full_name ?? undefined, email: p1.data.email ?? undefined, avatar: p1.data.avatar ?? null }); return; }
      const p2 = await supabase.from("profiles").select("full_name, avatar").eq("id", patientId).maybeSingle();
      if (!cancelled && p2.data) { setResolvedPatient({ name: p2.data.full_name ?? undefined, avatar: p2.data.avatar ?? null }); return; }
    })();
    return () => { cancelled = true; };
  }, [mode, patientId]);

  const canSend = useMemo(() => !!text.trim() && !!me && !!conversationId, [text, me, conversationId]);

  async function insertTextMessage(content: string) {
    if (!me || !conversationId) return;
    // optimistic
    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      patient_id: mode === "patient" ? me.id : patientId,
      sender_id: me.id, sender_name: me.name, sender_role: me.role,
      content, created_at: new Date().toISOString(), read: false, urgent: false,
      type: "text",
    };
    setMsgs((m) => [...m, optimistic]); scrollToBottom(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      patient_id: optimistic.patient_id,
      sender_id: me.id, sender_name: me.name, sender_role: me.role,
      content, read: false, urgent: false, type: "text",
    });
    if (error) setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
  }

  const send = useCallback(async () => {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    await insertTextMessage(content);
  }, [canSend, text]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterToSend = settings?.enterToSend ?? true;
    if (e.key === "Enter" && !e.shiftKey && enterToSend) { e.preventDefault(); void send(); }
  };

  // ---------- Attachments ----------

  function pickFile() { fileInputRef.current?.click(); }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || !me || !conversationId) return;
    setUploading({ label: file.type.startsWith("image/") ? "Uploading image…" : "Uploading file…" });
    try {
      const { publicUrl } = await uploadToStorage(file, { conversationId, kind: "image", userId: me.id });
      await sendAttachmentMessage({
        conversationId, senderRole: me.role, url: publicUrl,
        kind: "image",
      });
    } catch (err) {
      console.error(err); alert("Failed to send image.");
    } finally { setUploading(null); }
  }

  async function takePhoto() {
    if (!me || !conversationId) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement("video");
    video.srcObject = stream as any; await video.play();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b as Blob), "image/jpeg", 0.9)!);

    setUploading({ label: "Uploading photo…" });
    try {
      const { publicUrl } = await uploadToStorage(blob, { conversationId, kind: "image", userId: me.id });
      await sendAttachmentMessage({ conversationId, senderRole: me.role, url: publicUrl, kind: "image" });
    } catch (err) {
      console.error(err); alert("Failed to send photo.");
    } finally { setUploading(null); }
  }

  async function toggleRecord() {
    if (recording) { mediaRecRef.current?.stop(); return; }
    if (!me || !conversationId) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setUploading({ label: "Uploading voice note…" });
      try {
        const { publicUrl } = await uploadToStorage(blob, { conversationId, kind: "audio", userId: me.id });
        await sendAttachmentMessage({ conversationId, senderRole: me.role, url: publicUrl, kind: "audio" });
      } catch (err) {
        console.error(err); alert("Failed to send voice message.");
      } finally { setUploading(null); }
    };
    mediaRecRef.current = rec; setRecording(true); rec.start();
  }

  // ---------- Render helpers ----------
  const isOnline = mode === "staff" ? (dbOnline || rtOnline || threadOtherPresent) : false;

  const otherName =
    mode === "staff"
      ? resolvedPatient?.name || patientName || resolvedPatient?.email || "Patient"
      : providerName || "Provider";

  const otherAvatar = mode === "staff" ? resolvedPatient?.avatar ?? patientAvatarUrl ?? null : providerAvatarUrl ?? null;

  const resolveAttachment = (m: MessageRow): { url?: string; kind?: "image" | "audio" | "file" } => {
    // prefer new schema
    if (m.type && m.type !== "text") return { url: m.content, kind: m.type as "image" | "audio" };
    // fallback to legacy fields
    if (m.attachment_url && m.attachment_type) return { url: m.attachment_url, kind: m.attachment_type };
    return {};
  };

  return (
    <Card className="h-[620px] w-full overflow-hidden border-0 shadow-lg">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex items-center gap-3 border-b bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70">
          <div className="flex items-center gap-2">
            {onBack && (
              <button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800" onClick={onBack} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
              {otherAvatar ? (
                <img src={otherAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-cyan-100 text-cyan-700">
                  {(otherName || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              {mode === "staff" && (
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${
                    presenceLoading ? "bg-yellow-400" : isOnline ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">{otherName}</div>
              <div className="flex items-center gap-1 text-[11px]">
                {mode === "staff" ? (
                  presenceLoading ? (
                    <>
                      <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
                      <span className="text-yellow-600">Checking…</span>
                    </>
                  ) : (
                    <>
                      <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                      <span className={isOnline ? "text-emerald-600" : "text-gray-500"}>{isOnline ? "Online" : "Offline"}</span>
                    </>
                  )
                ) : (
                  <span className="text-gray-500">{providerRole || ""}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <IconButton aria="Voice call" onClick={() => phoneHref && window.open(phoneHref, "_blank")}><Phone className="h-5 w-5" /></IconButton>
            <IconButton aria="Video call" onClick={() => videoHref && window.open(videoHref, "_blank")}><Video className="h-5 w-5" /></IconButton>
            <IconButton aria="More"><MoreVertical className="h-5 w-5" /></IconButton>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950">
          <div className="mx-auto max-w-xl space-y-3">
            {msgs.map((m) => {
              const own = m.sender_id === me?.id;
              const bubble = own
                ? `bg-cyan-500 text-white ${bubbleBase} shadow-md`
                : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 ${bubbleBase} ring-1 ring-gray-200/70 dark:ring-zinc-700`;

              const att = resolveAttachment(m);

              return (
                <div key={m.id} className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
                  {!own && (
                    <div className="hidden sm:block h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 text-xs">
                        {(m.sender_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[82%] sm:max-w-[70%] ${bubble}`}>
                    {att.url && att.kind === "image" && (
                      <img src={att.url} alt="attachment" className="mb-2 max-h-64 w-full rounded-xl object-cover" />
                    )}
                    {att.url && att.kind === "audio" && <audio className="mb-2 w-full" controls src={att.url} />}
                    {!att.url && m.attachment_url && m.attachment_type === "file" && (
                      <a className="mb-2 block underline" href={m.attachment_url} target="_blank" rel="noreferrer">Download file</a>
                    )}
                    {m.content && (!m.type || m.type === "text") && (
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    )}
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {own && m.read && <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 opacity-90" />}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && <div className="px-1 text-xs text-gray-500">…typing</div>}
            {msgs.length === 0 && <div className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello 👋</div>}
          </div>
        </div>

        {(uploading || recording) && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              {recording ? "Recording… tap mic to stop" : uploading?.label}
              {!recording && (
                <button className="ml-1 rounded-full p-1 hover:bg-white/20" onClick={() => setUploading(null)}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-t bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70">
          <div className="mx-auto flex max-w-xl items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <IconButton aria="Emoji picker"><Smile className="h-5 w-5" /></IconButton>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Pick an emoji</DialogTitle></DialogHeader>
                  <EmojiGrid onPick={(e) => setText((v) => v + e)} />
                </DialogContent>
              </Dialog>

              <IconButton aria="Attach image" onClick={pickFile}><ImageIcon className="h-5 w-5" /></IconButton>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickFile} />
              <IconButton aria="Camera" onClick={takePhoto}><Camera className="h-5 w-5" /></IconButton>
              <IconButton aria="Voice note" onClick={toggleRecord}><Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} /></IconButton>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message…"
              className={`min-h[46px] max-h-[140px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700 ${
                settings?.density === "compact" ? "text-sm" : ""
              }`}
            />

            <Button disabled={!canSend} onClick={send} className="h-11 rounded-2xl px-4 shadow-md">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IconButton({ children, aria, onClick }: { children: React.ReactNode; aria: string; onClick?: () => void }) {
  return (
    <button type="button" aria-label={aria} onClick={onClick} className="rounded-full p-2 hover:bg-gray-100 active:scale-95 dark:hover:bg-zinc-800">
      {children}
    </button>
  );
}

function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  const groups: Record<string, string[]> = {
    "😀 Smileys": ["😀","😁","😂","🤣","😊","😍","😘","😎","🥳","😇","🙂","🙃","😌"],
    "👍 Gestures": ["👍","👎","👏","🙏","🤝","👌","✌️","🤞","👋","💪"],
    "❤️ Hearts": ["❤️","💙","💚","💛","🧡","💜","🖤","🤍","🤎","💕","💖"],
    "🔥 Misc": ["🔥","🎉","✨","⭐","🌟","🧠","💡","📌","✅","❗"],
  };
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([label, list]) => (
        <div key={label}>
          <p className="mb-2 text-xs font-medium text-gray-500">{label}</p>
          <div className="grid grid-cols-10 gap-2">
            {list.map((e) => (
              <button key={e} onClick={() => onPick(e)} className="rounded-md border p-2 text-xl hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-900" aria-label={`Insert ${e}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
