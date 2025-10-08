"use client";

import React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, Smile,
  Image as ImageIcon, Camera, Mic, CheckCheck, X
} from "lucide-react";
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
  attachment_url?: string | null; // storage path OR full URL (legacy)
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
  phoneHref?: string;
  videoHref?: string;
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

  const [dbOnline, setDbOnline] = useState<boolean>(false);
  const [rtOnline, setRtOnline] = useState<boolean>(false);
  const [presenceLoading, setPresenceLoading] = useState<boolean>(true);

  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // staged media (before send)
  const [draft, setDraft] = useState<{ blob: Blob; type: "image" | "audio" | "file"; name?: string; previewUrl: string } | null>(null);
  useEffect(() => () => { if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); }, [draft?.previewUrl]);

  const bubbleBase =
    (settings?.bubbleRadius ?? "rounded-2xl") +
    " px-4 py-2 " +
    ((settings?.density ?? "comfortable") === "compact" ? "text-sm" : "text-[15px]"));

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

  // resolve me + conversation
  useEffect(() => setConversationId(conversationIdProp ?? null), [conversationIdProp]);
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
          if (conv?.id) setConversationId(conv.id);
          else {
            const { data: created, error: upErr } = await supabase
              .from("conversations")
              .upsert(
                { patient_id: patientId, provider_id: pid, provider_name: providerName ?? null, provider_role: providerRole ?? null },
                { onConflict: "patient_id,provider_id" }
              )
              .select("id").single();
            if (upErr) { alert(`Failed to ensure conversation.\n\n${upErr.message}`); return; }
            setConversationId(created!.id);
          }
        }
      } else {
        setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
        if (!conversationIdProp) {
          const { data: conv } = await supabase
            .from("conversations").select("id")
            .eq("patient_id", uid).eq("provider_id", providerId!).maybeSingle();
          if (conv?.id) setConversationId(conv.id);
        }
      }
    })();
  }, [mode, patientId, providerId, providerName, providerRole, conversationIdProp]);

  // initial load
  useLayoutEffect(() => {
    if (!conversationId || !me) return;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) { alert(`Failed to load messages.\n\n${error.message}`); return; }
      setMsgs((data as MessageRow[]) ?? []);
      scrollToBottom(false);
      await markReadHelper(conversationId, me.role);
    })();
  }, [conversationId, me, scrollToBottom]);

  // live updates + typing
  useEffect(() => {
    if (!conversationId || !me) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const ch = supabase
      .channel(`thread_${conversationId}`, { config: { presence: { key: me.id } } })
      .on("presence", {

event: "sync"
      }, () => {
        const s = ch.presenceState();
        const others = Object.entries(s).flatMap(([, v]: any) => v) as any[];
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

  // typing beacon
  useEffect(() => {
    if (!channelRef.current || !me) return;
    const ch = channelRef.current;
    const t = setInterval(() => { ch.track({ user_id: me.id, status: text ? "typing" : "idle" }); }, 1500);
    ch.track({ user_id: me.id, status: text ? "typing" : "idle" });
    return () => clearInterval(t);
  }, [text, me]);

  // patient presence (unchanged)
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

  // staff presence (unchanged)
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
    const computeRtOnline = () => {
      const state = rtCh.presenceState() as Record<string, any[]>;
      const entries = state[patientId] || [];
      return Array.isArray(entries) && entries.length > 0;
    };
    const updateRt = () => { setRtOnline(computeRtOnline()); setPresenceLoading(false); };
    rtCh.on("presence", { event: "sync" }, updateRt).on("presence", { event: "join" }, updateRt).on("presence", { event: "leave" }, updateRt)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") { try { await rtCh.track({ observer: true, at: Date.now() }); } catch {} updateRt(); setTimeout(updateRt, 700); }
      });
    void fetchOnce(); const t1 = setTimeout(fetchOnce, 600);
    const refetchPresence = () => { void fetchOnce(); updateRt(); };
    const onVis = () => { if (document.visibilityState === "visible") refetchPresence(); };
    window.addEventListener("focus", refetchPresence); window.addEventListener("online", refetchPresence); document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true; clearTimeout(t1);
      try { supabase.removeChannel(dbCh); } catch {}
      try { supabase.removeChannel(rtCh); } catch {}
      window.removeEventListener("focus", refetchPresence); window.removeEventListener("online", refetchPresence); document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, patientId]);

  // derived
  const canSend = useMemo(() => (!!text.trim() || !!draft) && !!me && !!conversationId, [text, me, conversationId, draft]);
  const isOnline = mode === "staff" ? (dbOnline || rtOnline || threadOtherPresent) : false;
  const otherName = mode === "staff"
    ? resolvedPatient?.name || patientName || resolvedPatient?.email || "Patient"
    : providerName || "Provider";
  const otherAvatar = mode === "staff" ? (resolvedPatient?.avatar ?? patientAvatarUrl ?? null) : (providerAvatarUrl ?? null);

  // DB insert
  async function insertMessage(payload: { content: string; attachment_url?: string | null; attachment_type?: "image" | "audio" | "file" | null; }) {
    if (!me || !conversationId) return;

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      patient_id: mode === "patient" ? me.id : patientId,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: me.role,
      content: payload.content,
      created_at: new Date().toISOString(),
      read: false,
      urgent: false,
      attachment_url: payload.attachment_url ?? null,
      attachment_type: payload.attachment_type ?? null,
    };
    setMsgs((m) => [...m, optimistic]); scrollToBottom(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: optimistic.conversation_id,
      patient_id: optimistic.patient_id,
      sender_id: optimistic.sender_id,
      sender_name: optimistic.sender_name,
      sender_role: optimistic.sender_role,
      content: optimistic.content,
      read: false,
      urgent: false,
      attachment_url: optimistic.attachment_url,
      attachment_type: optimistic.attachment_type,
    });

    if (error) { setMsgs((m) => m.filter((x) => x.id !== optimistic.id)); throw error; }
  }

  // upload: return storage PATH (not URL)
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
    return path; // store only the path
  }

  // send
  const send = useCallback(async () => {
    if (!canSend) return;
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
        return;
      }
      await insertMessage({ content: contentText });
    } catch (err: any) {
      alert(`Failed to send.\n\n${err?.message ?? ""}`); setUploading(null);
    }
  }, [canSend, text, draft]);

  // attachment pick/capture/record
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
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("No photo")), "image/jpeg", 0.9)!);
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (e: any) { alert(`Camera error.\n\n${e?.message ?? ""}`); }
    finally { stream?.getTracks().forEach((t) => t.stop()); }
  }
  async function toggleRecord() {
    if (recording) { mediaRecRef.current?.stop(); return; }
    if (!me || !conversationId) return;
    if (typeof window.MediaRecorder === "undefined") { alert("Voice recording isn’t supported by this browser."); return; }
    let stream: MediaStream | null = null;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { alert("Microphone permission denied."); return; }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
                 MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop()); setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "audio", name: "voice.webm", previewUrl });
    };
    mediaRecRef.current = rec; setRecording(true); rec.start();
  }

  // clipboard paste -> image
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(e.clipboardData.files || [])[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault();
      if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10 MB)."); return; }
      const url = URL.createObjectURL(file);
      setDraft({ blob: file, type: "image", name: file.name || "pasted.jpg", previewUrl: url });
    }
  };

  // helpers for bubble
  function shouldShowPlainContent(content?: string | null) {
    const t = (content ?? "").trim().toLowerCase();
    return !!t && t !== "(image)" && t !== "(photo)";
  }
  function extractImageUrlFromContent(content?: string | null) {
    if (!content) return null;
    try {
      const maybe = JSON.parse(content);
      if (maybe && typeof maybe === "object" && maybe.type === "image" && typeof maybe.url === "string") return maybe.url as string;
    } catch {}
    const match = content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|heic|svg)(?:\?\S*)?/i);
    return match?.[0] ?? null;
  }
  function isHttp(u?: string | null) { return !!u && /^https?:\/\//i.test(u); }

  // SAFE resolver – never throw; returns null if cannot resolve
  async function toUrlFromPath(path: string) {
    try {
      const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
      if (pub?.data?.publicUrl) return pub.data.publicUrl; // bucket public
      const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60 * 24); // 24h
      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  }

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
              {otherAvatar ? <img src={otherAvatar} alt="" className="h-full w-full object-cover" /> :
                <div className="flex h-full w-full items-center justify-center bg-cyan-100 text-cyan-700">
                  {(otherName || "?").slice(0, 1).toUpperCase()}
                </div>}
              {mode === "staff" && (
                <span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${
                  presenceLoading ? "bg-yellow-400" : isOnline ? "bg-emerald-500" : "bg-gray-400"
                }`} />
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">{otherName}</div>
              <div className="flex items-center gap-1 text-[11px]">
                {mode === "staff" ? (
                  presenceLoading ? (<><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /><span className="text-yellow-600">Checking…</span></>) :
                  (<><span className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} /><span className={isOnline ? "text-emerald-600" : "text-gray-500"}>{isOnline ? "Online" : "Offline"}</span></>)
                ) : (<span className="text-gray-500">{providerRole || ""}</span>)}
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

        {draft && (
          <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl border bg-white px-2 py-1 text-xs shadow dark:border-zinc-700 dark:bg-zinc-800">
              <div className="max-h-16 max-w-[160px] overflow-hidden rounded-md ring-1 ring-gray-200 dark:ring-zinc-700">
                {draft.type === "image" && <img src={draft.previewUrl} alt="preview" className="h-16 w-auto object-cover" />}
                {draft.type === "audio" && <audio controls src={draft.previewUrl} className="h-10 w-[160px]" />}
                {draft.type === "file" && <div className="px-2 py-3">📎 {draft.name || "file"}</div>}
              </div>
              <button className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => { if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl); setDraft(null); }}
                aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </button>
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

              <IconButton aria="Attach image" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-5 w-5" /></IconButton>
              <input ref={fileInputRef} type="file" accept="image/*,audio/*" hidden onChange={onPickFile} />
              <IconButton aria="Camera" onClick={takePhoto}><Camera className="h-5 w-5" /></IconButton>
              <IconButton aria="Voice note" onClick={toggleRecord}><Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} /></IconButton>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                const enterToSend = settings?.enterToSend ?? true;
                if (e.key === "Enter" && !e.shiftKey && enterToSend) { e.preventDefault(); void send(); }
              }}
              onPaste={onPaste}
              placeholder="Type your message…"
              className={`min-h-[46px] max-h-[140px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700 ${
                settings?.density === "compact" ? "text-sm" : ""
              }`}
            />

            <Button disabled={!canSend} onClick={send} className="h-11 rounded-2xl px-4 shadow-md" aria-busy={!!uploading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
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

/** Message bubble: resolves storage paths to usable URLs (all types). */
function MessageBubble({
  m, own, bubbleBase, shouldShowPlainContent, extractImageUrlFromContent, isHttp, toUrlFromPath,
}: {
  m: MessageRow;
  own: boolean;
  bubbleBase: string;
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
      // legacy messages where the URL is in content
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
          <img
            src={attUrl}
            alt="image"
            className="mb-2 max-h-64 w-full rounded-xl object-cover"
            onError={() => setAttUrl(null)}
          />
        )}
        {m.attachment_type === "audio" && attUrl && (
          <audio className="mb-2 w-full" controls src={attUrl} onError={() => setAttUrl(null)} />
        )}
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

/* ----------------------------- Error Boundary ------------------------------ */

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any, info: any) {
    console.error("[ChatBox] crashed:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-red-600">
          Chat failed to render. Please reload this page. If it persists, check Storage permissions and message attachments.
        </div>
      );
    }
    return this.props.children;
  }
}
