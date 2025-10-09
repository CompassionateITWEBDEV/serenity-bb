"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, Image as ImageIcon, Camera, Mic, CheckCheck, X, Maximize2, Minimize2, MicOff, VideoOff, Volume2, VolumeX, Clock } from "lucide-react";
import type { ProviderRole } from "@/lib/chat";
import { markRead as markReadHelper } from "@/lib/chat";

/* ----------------------------- Types & settings ---------------------------- */
type Provider = ProviderRole;

type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | Provider;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
  attachment_url?: string | null;
  attachment_type?: "image" | "audio" | "file" | null;
};

type UiSettings = {
  theme?: "light" | "dark" | "system";
  density?: "comfortable" | "compact";
  bubbleRadius?: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend?: boolean;
  sound?: boolean;
};

const CHAT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET?.trim() || "chat";

/* -------------------------------- Component -------------------------------- */
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
  phoneHref?: string;   // no longer used for calling
  videoHref?: string;   // no longer used for calling
  conversationId?: string;
}) {
  return (
    <ErrorBoundary>
      <ChatBoxInner {...props} />
    </ErrorBoundary>
  );
}

/* ------------------------------ Inner (logic) ------------------------------ */
function ChatBoxInner(props: {
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
    mode,
    patientId,
    providerId,
    providerName,
    providerRole,
    providerAvatarUrl,
    patientName,
    patientAvatarUrl,
    settings,
    onBack,
    conversationId: conversationIdProp,
  } = props;

  const [conversationId, setConversationId] = useState<string | null>(conversationIdProp ?? null);
  const [me, setMe] = useState<{ id: string; name: string; role: "patient" | Provider } | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const [uploading, setUploading] = useState<{ label: string } | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);

  const [threadOtherPresent, setThreadOtherPresent] = useState<boolean>(false);
  const [resolvedPatient, setResolvedPatient] = useState<{ name?: string; email?: string; avatar?: string | null } | null>(null);

  const [dbOnline, setDbOnline] = useState<boolean>(false);
  const [rtOnline, setRtOnline] = useState<boolean>(false);
  const [presenceLoading, setPresenceLoading] = useState<boolean>(true);

  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const signalRef = useRef<ReturnType<typeof supabase.channel> | null>(null); // signaling
  const signalReadyRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // staged media (before send)
  const [draft, setDraft] = useState<{ blob: Blob; type: "image" | "audio" | "file"; name?: string; previewUrl: string } | null>(null);
  useEffect(() => () => { if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); }, [draft?.previewUrl]);

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
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12); o.stop(ctx.currentTime + 0.12);
    } catch {}
  }, [settings?.sound]);

  const scrollToBottom = useCallback((smooth = false) => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  /* ---------------- resolve me + conversation ---------------- */
  useEffect(() => setConversationId(conversationIdProp ?? null), [conversationIdProp]);
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) return;

      if (mode === "staff") {
        const pid = (providerId || uid) as string;
        setMe({ id: pid, name: providerName || "Me", role: providerRole! });

        if (!conversationIdProp) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("patient_id", patientId)
            .eq("provider_id", pid)
            .maybeSingle();
          if (conv?.id) setConversationId(conv.id);
          else {
            const { data: created, error: upErr } = await supabase
              .from("conversations")
              .upsert(
                {
                  patient_id: patientId,
                  provider_id: pid,
                  provider_name: providerName ?? null,
                  provider_role: providerRole ?? null,
                },
                { onConflict: "patient_id,provider_id" }
              )
              .select("id")
              .single();
            if (upErr) { alert(`Failed to ensure conversation.\n\n${upErr.message}`); return; }
            setConversationId(created!.id);
          }
        }
      } else {
        setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
        if (!conversationIdProp && providerId) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("patient_id", uid)
            .eq("provider_id", providerId)
            .maybeSingle();
          if (conv?.id) setConversationId(conv.id);
        }
      }
    })();
  }, [mode, patientId, providerId, providerName, providerRole, conversationIdProp]);

  /* ---------------- initial load ---------------- */
  useLayoutEffect(() => {
    if (!conversationId || !me) return;
    (async () => {
      const { data, error } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) { alert(`Failed to load messages.\n\n${error.message}`); return; }
      setMsgs((data as MessageRow[]) ?? []);
      scrollToBottom(false);
      await markReadHelper(conversationId, me.role);
    })();
  }, [conversationId, me, scrollToBottom]);

  /* ---------------- live updates + typing ---------------- */
  useEffect(() => {
    if (!conversationId || !me) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const ch = supabase
      .channel(`thread_${conversationId}`, { config: { presence: { key: me.id } } })
      .on("presence", { event: "sync" }, () => {
        const s = ch.presenceState() as Record<string, any[]>;
        const others = Object.values(s).flat() as any[];
        setTyping(others.some((x) => x.status === "typing"));
        setThreadOtherPresent(others.some((x) => x.user_id && x.user_id !== me.id));
      })
      .on("postgres_changes",
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${conversationId}` },
        async (p) => {
          const row = p.new as MessageRow;
          setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
          scrollToBottom(true);
          if (row.sender_id !== me.id) { ding(); await markReadHelper(conversationId, me.role); }
        }
      )
      .on("postgres_changes",
        { schema: "public", table: "messages", event: "UPDATE", filter: `conversation_id=eq.${conversationId}` },
        async () => {
          const { data } = await supabase
            .from("messages").select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
          setMsgs((data as MessageRow[]) ?? []);
        }
      )
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

  /* ---------------- typing beacon ---------------- */
  useEffect(() => {
    if (!channelRef.current || !me) return;
    const ch = channelRef.current;
    const t = setInterval(() => { ch.track({ user_id: me.id, status: text ? "typing" : "idle" }); }, 1500);
    ch.track({ user_id: me.id, status: text ? "typing" : "idle" });
    return () => clearInterval(t);
  }, [text, me]);

  /* ---------------- presence (patient/staff) ---------------- */
  useEffect(() => {
    if (mode !== "patient") return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id; if (!uid) return;
      const beat = async () => { try { await supabase.rpc("patient_heartbeat"); } catch {} };
      await beat(); const fast = setInterval(beat, 1000); setTimeout(() => clearInterval(fast), 2200);
      const slow = setInterval(beat, 10000);
      const ch = supabase.channel(`online:${uid}`, { config: { presence: { key: uid } } });
      ch.subscribe((s) => { if (s === "SUBSCRIBED") { const ping = () => ch.track({ online: true, at: Date.now() }); ping(); setTimeout(ping, 600); } });
      const onFocus = () => { void beat(); try { ch.track({ online: true, at: Date.now() }); } catch {} };
      const onVis = () => { if (document.visibilityState === "visible") onFocus(); };
      window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onVis);
      return () => { clearInterval(slow); try { supabase.removeChannel(ch); } catch {}; window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVis); };
    })();
  }, [mode]);

  useEffect(() => {
    if (mode !== "staff" || !patientId) return;
    let cancelled = false;
    setPresenceLoading(true);
    const fetchOnce = async () => {
      try {
        const { data } = await supabase.from("v_patient_online").select("online,last_seen").eq("user_id", patientId).maybeSingle();
        if (!cancelled && data) setDbOnline(!!data.online);
      } catch {}
    };
    const dbCh = supabase
      .channel(`presence_db_${patientId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (p) => { const last = new Date(p.new.last_seen as string).getTime(); setDbOnline(Date.now() - last < 15000); setPresenceLoading(false); }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (p) => { const last = new Date(p.new.last_seen as string).getTime(); setDbOnline(Date.now() - last < 15000); setPresenceLoading(false); }
      )
      .subscribe();
    const staffKey = `staff-${crypto.randomUUID()}`;
    const rtCh = supabase.channel(`online:${patientId}`, { config: { presence: { key: staffKey } } });
    const computeRtOnline = () => {
      const state = rtCh.presenceState() as Record<string, any[]>;
      const entries = state[patientId] || [];
      return Array.isArray(entries) && entries.length > 0;
    };
    const updateRt = () => { setRtOnline(computeRtOnline()); setPresenceLoading(false); };
    rtCh.on("presence", { event: "sync" }, updateRt).on("presence", { event: "join" }, updateRt).on("presence", { event: "leave" }, updateRt).subscribe((status) => {
      if (status === "SUBSCRIBED") { try { rtCh.track({ observer: true, at: Date.now() }); } catch {} updateRt(); setTimeout(updateRt, 700); }
    });
    void fetchOnce(); const t1 = setTimeout(fetchOnce, 600);
    const refetchPresence = () => { void fetchOnce(); updateRt(); };
    const onVis = () => { if (document.visibilityState === "visible") refetchPresence(); };
    window.addEventListener("focus", refetchPresence);
    window.addEventListener("online", refetchPresence);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true; clearTimeout(t1);
      try { supabase.removeChannel(dbCh); } catch {}
      try { supabase.removeChannel(rtCh); } catch {}
      window.removeEventListener("focus", refetchPresence);
      window.removeEventListener("online", refetchPresence);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, patientId]);

  /* ---------------- derived ---------------- */
  const canSend = useMemo(() => (!!text.trim() || !!draft) && !!me && !!conversationId && !sending && !uploading, [text, me, conversationId, draft, sending, uploading]);
  const isOnline = mode === "staff" ? dbOnline || rtOnline || threadOtherPresent : false;
  const otherName = mode === "staff" ? resolvedPatient?.name || patientName || resolvedPatient?.email || "Patient" : providerName || "Provider";
  const otherAvatar = mode === "staff" ? resolvedPatient?.avatar ?? patientAvatarUrl ?? null : providerAvatarUrl ?? null;

  /* =========================== CALLING (Messenger-like) =========================== */
  const [incomingCall, setIncomingCall] = useState<{ fromName: string; room: string; mode: "audio" | "video" } | null>(null);
  const [showCall, setShowCall] = useState(false);
  const [callRole, setCallRole] = useState<"caller" | "callee">("caller");
  const [callMode, setCallMode] = useState<"audio" | "video">("audio");
  const callRoomRef = useRef<string | null>(null);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  function playRing(loop = true) {
    try {
      if (!ringAudioRef.current) {
        const a = new Audio("data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA..."); // replace with your /public/ring.mp3
        a.loop = loop; ringAudioRef.current = a;
      }
      ringAudioRef.current.currentTime = 0;
      ringAudioRef.current.play().catch(() => {});
    } catch {}
  }
  function stopRing() {
    try { ringAudioRef.current?.pause(); if (ringAudioRef.current) ringAudioRef.current.currentTime = 0; } catch {}
  }

  // signaling channel lifecycle
  useEffect(() => {
    if (!conversationId || !me) return;
    signalReadyRef.current = false;
    if (signalRef.current) { try { supabase.removeChannel(signalRef.current); } catch {} signalRef.current = null; }

    const ch = supabase.channel(`video_${conversationId}`, { config: { broadcast: { self: true } } });
    signalRef.current = ch;

    ch
      .on("broadcast", { event: "ring" }, (p) => {
        const { room, fromName, mode } = (p.payload || {}) as { room: string; fromName: string; mode: "audio" | "video" };
        setIncomingCall({ room, fromName: fromName || "Caller", mode: mode || "audio" });
        playRing(true);
      })
      .on("broadcast", { event: "hangup" }, () => { stopRing(); setIncomingCall(null); })
      .on("broadcast", { event: "answered" }, () => { stopRing(); });

    ch.subscribe((status) => { if (status === "SUBSCRIBED") signalReadyRef.current = true; });

    return () => {
      try { if (signalRef.current) supabase.removeChannel(signalRef.current); } catch {}
      signalRef.current = null; signalReadyRef.current = false; stopRing();
    };
  }, [conversationId, me]);

  async function ensureSignalReady() {
    const deadline = Date.now() + 4000;
    while (!signalReadyRef.current && Date.now() < deadline) await new Promise((r) => setTimeout(r, 40));
    if (!signalReadyRef.current || !signalRef.current) throw new Error("Signaling not ready");
    return signalRef.current;
  }

  async function startCall(mode: "audio" | "video") {
    if (!conversationId || !me) { alert("Open a conversation first."); return; }
    try {
      const ch = await ensureSignalReady();
      const room = `${conversationId}`; // simple room id
      callRoomRef.current = room;
      setCallRole("caller");
      setCallMode(mode);
      setShowCall(true);
      playRing(true);
      await ch.send({ type: "broadcast", event: "ring", payload: { room, fromName: me.name, mode } });
    } catch (e: any) {
      alert(`Call failed.\n\n${e?.message || "Signaling not ready."}`);
    }
  }

  function acceptIncoming(room: string, mode: "audio" | "video") {
    callRoomRef.current = room;
    setCallRole("callee");
    setCallMode(mode);
    setIncomingCall(null);
    stopRing();
    try { signalRef.current?.send({ type: "broadcast", event: "answered", payload: { room } }); } catch {}
    setShowCall(true);
  }

  function declineIncoming() {
    setIncomingCall(null);
    stopRing();
    try { signalRef.current?.send({ type: "broadcast", event: "hangup", payload: {} }); } catch {}
  }

  /* ---------------- message send/upload ---------------- */
  async function insertMessage(payload: { content: string; attachment_url?: string | null; attachment_type?: "image" | "audio" | "file" | null }) {
    if (!me || !conversationId) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      patient_id: mode === "patient" ? me.id : patientId,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: me.role,
      content: payload.content,
      read: false,
      urgent: false,
      attachment_url: payload.attachment_url ?? null,
      attachment_type: payload.attachment_type ?? null,
    });
    if (error) throw error;
  }

  async function uploadToChat(fileOrBlob: Blob, fileName?: string) {
    if (!conversationId || !me) throw new Error("Missing conversation");
    const detected = (fileOrBlob as File).type || (fileOrBlob as any).type || "";
    const extFromName = (fileName || "").split(".").pop() || "";
    const ext = extFromName || (detected.startsWith("image/") ? detected.split("/")[1] : detected ? "webm" : "bin");
    const path = `${conversationId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(CHAT_BUCKET).upload(path, fileOrBlob, {
      contentType: detected || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      if (/not found/i.test(upErr.message)) throw new Error(`Bucket "${CHAT_BUCKET}" not found.`);
      throw upErr;
    }
    return path;
  }

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const contentText = text.trim();
    setText("");
    try {
      if (draft) {
        setUploading({ label: "Sending…" });
        const storagePath = await uploadToChat(
          draft.blob,
          draft.name || (draft.type === "image" ? "image.jpg" : draft.type === "audio" ? "voice.webm" : "file.bin")
        );
        const content = draft.type === "audio" ? contentText || "(voice note)" : contentText;
        await insertMessage({ content: content || "", attachment_url: storagePath, attachment_type: draft.type });
        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
        setDraft(null); setUploading(null);
      } else {
        await insertMessage({ content: contentText });
      }
    } catch (err: any) {
      alert(`Failed to send.\n\n${err?.message ?? ""}`);
      setUploading(null);
      setText((t) => t || contentText);
    } finally {
      setSending(false);
    }
  }, [canSend, text, draft]);

  /* ---------------- pick/capture/record ---------------- */
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || !me || !conversationId) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10 MB)."); return; }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }

  async function takePhoto() {
    if (!me || !conversationId) return;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video"); video.srcObject = stream as any; await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = (video as any).videoWidth || 640; canvas.height = (video as any).videoHeight || 480;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No photo"))), "image/jpeg", 0.9)!);
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (e: any) { alert(`Camera error.\n\n${e?.message ?? ""}`); }
    finally { stream?.getTracks().forEach((t) => t.stop()); }
  }

  async function toggleRecord() {
    if (recording) { try { mediaRecRef.current?.stop(); } catch {}; return; }
    if (!me || !conversationId) return;
    if (typeof window.MediaRecorder === "undefined") { alert("Voice recording isn’t supported by this browser."); return; }
    let stream: MediaStream | null = null;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { alert("Microphone permission denied."); return; }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "audio", name: "voice.webm", previewUrl });
    };
    mediaRecRef.current = rec; setRecording(true); rec.start();
  }

  /* ---------------- helpers for bubble ---------------- */
  function shouldShowPlainContent(content?: string | null) {
    const t = (content ?? "").trim().toLowerCase();
    return !!t && t !== "(image)" && t !== "(photo)";
  }
  function extractImageUrlFromContent(content?: string | null) {
    if (!content) return null;
    try {
      const maybe = JSON.parse(content);
      if (maybe && typeof maybe === "object" && maybe.type === "image" && typeof maybe.url === "string")
        return maybe.url as string;
    } catch {}
    const match = content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|heic|svg)(?:\?\S*)?/i);
    return match?.[0] ?? null;
  }
  function isHttp(u?: string | null) { return !!u && /^https?:\/\//i.test(u); }
  async function toUrlFromPath(path: string) {
    try { const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60 * 24); if (data?.signedUrl) return data.signedUrl; } catch {}
    try { const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path); return pub?.data?.publicUrl ?? null; } catch { return null; }
  }

  /* ---------------- render ---------------- */
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
            {/* New: in-app calls (no phone #) */}
            <IconButton aria="Voice call" onClick={() => startCall("audio")}>
              <Phone className="h-5 w-5" />
            </IconButton>
            <IconButton aria="Video call" onClick={() => startCall("video")}>
              <Video className="h-5 w-5" />
            </IconButton>
            <IconButton aria="More">
              <MoreVertical className="h-5 w-5" />
            </IconButton>
          </div>
        </div>

        {/* Incoming call banner */}
        {incomingCall && (
          <div className="mx-3 mt-2 rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100 flex items-center gap-3">
            <span>{incomingCall.mode === "audio" ? "📞" : "📹"} Incoming {incomingCall.mode} call from <b>{incomingCall.fromName}</b></span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" onClick={() => acceptIncoming(incomingCall.room, incomingCall.mode)}>Accept</Button>
              <Button size="sm" variant="outline" onClick={declineIncoming}>Decline</Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950">
          <div className="mx-auto max-w-xl space-y-3">
            {msgs.map((m) => {
              const own = m.sender_id === me?.id;
              return (
                <MessageBubble
                  key={m.id}
                  m={m}
                  own={own}
                  bubbleBase={bubbleBase}
                  shouldShowPlainContent={shouldShowPlainContent}
                  extractImageUrlFromContent={extractImageUrlFromContent}
                  isHttp={isHttp}
                  toUrlFromPath={toUrlFromPath}
                />
              );
            })}
            {typing && <div className="px-1 text-xs text-gray-500">…typing</div>}
            {msgs.length === 0 && <div className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello 👋</div>}
          </div>
        </div>

        {/* Composer */}
        <div className="border-top bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70 border-t">
          <div className="mx-auto max-w-xl">
            {draft && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border bg-white px-2 py-1 text-xs shadow dark:border-zinc-700 dark:bg-zinc-800">
                <div className="max-h-20 max-w-[200px] overflow-hidden rounded-md ring-1 ring-gray-200 dark:ring-zinc-700">
                  {draft.type === "image" && <img src={draft.previewUrl} alt="preview" className="h-20 w-auto object-cover" />}
                  {draft.type === "audio" && <audio controls src={draft.previewUrl} className="h-10 w-[180px]" />}
                  {draft.type === "file" && <div className="px-2 py-3">📎 {draft.name || "file"}</div>}
                </div>
                <button
                  className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-700"
                  onClick={() => { if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl); setDraft(null); }}
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
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

                <IconButton aria="Attach image or audio" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-5 w-5" />
                </IconButton>
                <input ref={fileInputRef} type="file" accept="image/*,audio/*" hidden onChange={onPickFile} />
                <IconButton aria="Camera" onClick={takePhoto}><Camera className="h-5 w-5" /></IconButton>
                <IconButton aria={recording ? "Stop voice recording" : "Start voice recording"} onClick={toggleRecord}>
                  <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
                </IconButton>
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  const enterToSend = settings?.enterToSend ?? true;
                  if (e.key === "Enter" && !e.shiftKey && enterToSend) { e.preventDefault(); void send(); }
                }}
                onPaste={(e) => {
                  const file = Array.from(e.clipboardData.files || [])[0];
                  if (file && file.type.startsWith("image/")) {
                    e.preventDefault();
                    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10 MB)."); return; }
                    const url = URL.createObjectURL(file);
                    setDraft({ blob: file, type: "image", name: file.name || "pasted.jpg", previewUrl: url });
                  }
                }}
                placeholder="Type your message…"
                className={`min-h-[46px] max-h-[140px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700 ${settings?.density === "compact" ? "text-sm" : ""}`}
              />

              <Button disabled={!canSend} onClick={send} className="h-11 rounded-2xl px-4 shadow-md" aria-busy={!!uploading || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
              <span>{settings?.enterToSend ?? true ? "Enter to send • Shift+Enter newline" : "Click Send • Enter newline"}</span>
              {(sending || uploading) && <span>Sending…</span>}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Call window */}
      <CallWindow
        open={showCall}
        onClose={() => {
          setShowCall(false);
          stopRing();
          try { signalRef.current?.send({ type: "broadcast", event: "hangup", payload: {} }); } catch {}
        }}
        role={callRole}
        conversationId={conversationId || ""}
        roomId={callRoomRef.current || ""}
        mode={callMode}
        peerName={otherName}
        peerAvatar={otherAvatar || undefined}
      />
    </Card>
  );
}

/* ------------------------------ Small helpers ------------------------------ */
function IconButton({ children, aria, onClick }: { children: React.ReactNode; aria: string; onClick?: () => void }) {
  return (
    <button type="button" aria-label={aria} onClick={onClick} className="rounded-full p-2 hover:bg-gray-100 active:scale-95 dark:hover:bg-zinc-800">
      {children}
    </button>
  );
}

function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  const groups: Record<string, string[]> = {
    "😀 Smileys": ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🥳", "😇", "🙂", "🙃", "😌"],
    "👍 Gestures": ["👍", "👎", "👏", "🙏", "🤝", "👌", "✌️", "🤞", "👋", "💪"],
    "❤️ Hearts": ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💕", "💖"],
    "🔥 Misc": ["🔥", "🎉", "✨", "⭐", "🌟", "🧠", "💡", "📌", "✅", "❗"],
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

/** Message bubble */
function MessageBubble({
  m, own, bubbleBase, shouldShowPlainContent, extractImageUrlFromContent, isHttp, toUrlFromPath,
}: {
  m: MessageRow; own: boolean; bubbleBase: string;
  shouldShowPlainContent: (c?: string | null) => boolean;
  extractImageUrlFromContent: (c?: string | null) => string | null;
  isHttp: (u?: string | null) => boolean;
  toUrlFromPath: (p: string) => Promise<string | null>;
}) {
  const bubble = own
    ? `bg-cyan-500 text-white ${bubbleBase} shadow-md`
    : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 ${bubbleBase} ring-1 ring-gray-200/70 dark:ring-zinc-700`;
  const [attUrl, setAttUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (m.attachment_url) {
        if (isHttp(m.attachment_url)) { if (!cancelled) setAttUrl(m.attachment_url); return; }
        const url = await toUrlFromPath(m.attachment_url);
        if (!cancelled) setAttUrl(url);
        return;
      }
      const fromContent = extractImageUrlFromContent(m.content);
      if (!cancelled) setAttUrl(fromContent || null);
    })();
    return () => { cancelled = true; };
  }, [m.id, m.attachment_type, m.attachment_url, m.content, isHttp, toUrlFromPath, extractImageUrlFromContent]);

  const showText = shouldShowPlainContent(m.content);

  return (
    <div className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
      {!own && (
        <div className="hidden sm:block h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 text-xs">
            {(m.sender_name || "?").slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      <div className={`max-w-[82%] sm:max-w-[70%] ${bubble}`}>
        {m.attachment_type === "image" && attUrl && (
          <img src={attUrl} alt="image" className="mb-2 max-h-64 w-full rounded-xl object-cover" onError={() => setAttUrl(null)} />
        )}
        {m.attachment_type === "audio" && attUrl && <audio className="mb-2 w-full" controls src={attUrl} onError={() => setAttUrl(null)} />}
        {m.attachment_type === "file" && attUrl && (
          <a className="mb-2 block underline" href={attUrl} target="_blank" rel="noreferrer">Download file</a>
        )}
        {showText && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
        <div className={`mt-1 flex items-center gap-1 text-[10px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {own && m.read && <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 opacity-90" />}
        </div>
      </div>
    </div>
  );
}

/* ============================= Call window ============================= */
function CallWindow({
  open, onClose, role, conversationId, roomId, mode, peerName, peerAvatar,
}: {
  open: boolean; onClose: () => void;
  role: "caller" | "callee";
  conversationId: string; roomId: string;
  mode: "audio" | "video";
  peerName: string; peerAvatar?: string;
}) {
  const [isMax, setIsMax] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [speakerOn, setSpeakerOn] = useState(true);

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 860, h: 560 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ w0: number; h0: number; x0: number; y0: number } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<number | null>(null);

  const pcInit: RTCConfiguration = useMemo(() => ({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      // TODO: add your TURN server for production reliability
    ],
  }), []);

  useEffect(() => {
    if (!open) return;
    timerRef.current = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setElapsedSec(0); };
  }, [open]);

  useEffect(() => {
    if (!open || !conversationId || !roomId) return;
    let ended = false;

    async function setup() {
      const pc = new RTCPeerConnection(pcInit);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const [remote] = e.streams;
        if (mode === "video") { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote; }
        else { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote; }
      };

      pc.onicecandidate = async (e) => {
        if (e.candidate && chanRef.current) {
          await chanRef.current.send({ type: "broadcast", event: "ice", payload: { room: roomId, candidate: e.candidate } });
        }
      };

      streamRef.current = await navigator.mediaDevices.getUserMedia(mode === "video" ? { video: true, audio: true } : { audio: true, video: false });
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = micOn));
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = camOn));
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));

      if (mode === "video") { if (localVideoRef.current) localVideoRef.current.srcObject = streamRef.current; }
      else { if (localAudioRef.current) localAudioRef.current.srcObject = streamRef.current; }

      const ch = supabase.channel(`video_${conversationId}`, { config: { broadcast: { self: false } } });
      chanRef.current = ch;

      ch.on("broadcast", { event: "offer" }, async (p) => {
        const { room, sdp } = p.payload as any; if (room !== roomId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        await ch.send({ type: "broadcast", event: "answer", payload: { room: roomId, sdp: answer } });
      });

      ch.on("broadcast", { event: "answer" }, async (p) => {
        const { room, sdp } = p.payload as any; if (room !== roomId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      ch.on("broadcast", { event: "ice" }, async (p) => {
        const { room, candidate } = p.payload as any; if (room !== roomId || !pcRef.current) return;
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      });

      ch.on("broadcast", { event: "hangup" }, () => { if (!ended) cleanup(); });

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
  }, [open, role, conversationId, roomId, pcInit, onClose, mode, micOn, camOn]);

  function toggleMic() { setMicOn((v) => { streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !v)); return !v; }); }
  function toggleCam() { if (mode !== "video") return; setCamOn((v) => { streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !v)); return !v; }); }
  function toggleSpeaker() {
    setSpeakerOn((v) => {
      if (remoteAudioRef.current) remoteAudioRef.current.muted = v;
      if (remoteVideoRef.current) remoteVideoRef.current.muted = v;
      return !v;
    });
  }

  // window controls + drag/resize
  const clamp = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));
  function headerDown(e: React.PointerEvent) {
    if (isMax) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function headerMove(e: React.PointerEvent) {
    if (!dragRef.current || isMax) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({ x: clamp(e.clientX - dragRef.current.dx, 0, vw - size.w), y: clamp(e.clientY - dragRef.current.dy, 0, vh - size.h) });
  }
  function headerUp(e: React.PointerEvent) {
    if (!dragRef.current) return; dragRef.current = null; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }
  function resizeDown(e: React.PointerEvent) {
    if (isMax) return;
    resizeRef.current = { w0: size.w, h0: size.h, x0: e.clientX, y0: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function resizeMove(e: React.PointerEvent) {
    const st = resizeRef.current; if (!st || isMax) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    setSize({
      w: clamp(st.w0 + (e.clientX - st.x0), 540, vw - pos.x - 8),
      h: clamp(st.h0 + (e.clientY - st.y0), 360, vh - pos.y - 8),
    });
  }
  function resizeUp(e: React.PointerEvent) {
    if (!resizeRef.current) return; resizeRef.current = null; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  if (!open) return null;

  const containerStyle = isMax ? { inset: 0 as any } : { top: pos.y, left: pos.x, width: size.w, height: size.h } as any;
  const hhmmss = (() => {
    const s = elapsedSec; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return [h, m, ss].map((n) => String(n).padStart(2, "0")).join(":");
  })();

  return (
    <div className="fixed inset-0 z-[60] bg-black/50">
      <div className="fixed z-[70] bg-white dark:bg-zinc-900 shadow-2xl border dark:border-zinc-800 rounded-2xl overflow-hidden" style={containerStyle}>
        {/* Title bar */}
        <div
          className="flex items-center gap-2 border-b dark:border-zinc-800 px-3 py-2 select-none"
          onDoubleClick={() => setIsMax((v) => !v)}
          onPointerDown={headerDown}
          onPointerMove={headerMove}
          onPointerUp={headerUp}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 overflow-hidden rounded-full ring-1 ring-gray-200">
              {peerAvatar ? <img src={peerAvatar} alt="" className="h-full w-full object-cover" /> :
                <div className="grid h-full w-full place-items-center bg-gray-100 text-xs text-gray-600">{(peerName || "?").slice(0, 1).toUpperCase()}</div>}
            </div>
            <div className="text-sm font-medium">{peerName}</div>
            <div className="ml-2 flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> <span className="tabular-nums">{hhmmss}</span></div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setIsMax((v) => !v)} title={isMax ? "Restore" : "Maximize"}>
              {isMax ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="destructive" onClick={onClose}>End</Button>
          </div>
        </div>

        {/* Stage */}
        <div className={`p-3 ${isMax ? "h-[calc(100vh-60px)]" : "h-[calc(100%-44px)]"} relative`}>
          {mode === "video" ? (
            <div className="absolute inset-0">
              <video ref={remoteVideoRef} autoPlay playsInline muted={!speakerOn} className="h-full w-full rounded-lg bg-black object-cover" />
              {/* Local PiP */}
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 h-28 w-40 rounded-md ring-1 ring-white/60 bg-black object-cover" />
            </div>
          ) : (
            <div className="absolute inset-0 grid grid-cols-2 gap-3">
              <div className="grid place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="text-sm text-gray-600 dark:text-gray-300">You (mic {micOn ? "on" : "off"})</div>
                <audio ref={localAudioRef} autoPlay muted />
              </div>
              <div className="grid place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="text-sm text-gray-600 dark:text-gray-300">Peer</div>
                <audio ref={remoteAudioRef} autoPlay muted={!speakerOn} />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-1 shadow-lg border dark:border-zinc-700">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSpeakerOn((v) => { if (remoteAudioRef.current) remoteAudioRef.current.muted = v; if (remoteVideoRef.current) remoteVideoRef.current.muted = v; return !v; })} title="Speaker">
              {speakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={toggleMic} title="Mic">
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            {mode === "video" && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={toggleCam} title="Camera">
                {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
            )}
            <Button size="sm" variant="destructive" className="rounded-full" onClick={onClose}>End</Button>
          </div>

          {/* Resize handle */}
          {!isMax && (
            <div
              className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize opacity-60"
              onPointerDown={resizeDown}
              onPointerMove={resizeMove}
              onPointerUp={resizeUp}
              aria-label="Resize"
              title="Resize"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Error Boundary ------------------------------ */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any, info: any) { console.error("[ChatBox] crashed:", err, info); }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-sm text-red-600">Chat failed to render. Please reload this page. If it persists, check Storage permissions and message attachments.</div>;
    }
    return this.props.children;
  }
}
