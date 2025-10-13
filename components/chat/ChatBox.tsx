"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  Smile,
  Image as ImageIcon,
  Camera,
  Mic,
  CheckCheck,
  Maximize2,
  Minimize2,
  PhoneOff,
  Monitor,
  Volume2,
} from "lucide-react";
import type { ProviderRole } from "@/lib/chat";
import { markRead as markReadHelper } from "@/lib/chat";

/* ----------------------------- Types & settings ---------------------------- */

type Provider = ProviderRole;

type MessageMeta = {
  image_path?: string | null;
  audio_path?: string | null;
  duration_sec?: number | null;
};

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
  meta?: MessageMeta | null;
};

type UiSettings = {
  theme?: "light" | "dark" | "system";
  density?: "comfortable" | "compact";
  bubbleRadius?: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend?: boolean;
  sound?: boolean;
};

const CHAT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET?.trim() || "chat";

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
    phoneHref,
    videoHref,
    conversationId: conversationIdProp,
  } = props;

  const [conversationId, setConversationId] = useState<string | null>(conversationIdProp ?? null);
  const [me, setMe] = useState<{ id: string; name: string; role: "patient" | Provider } | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const [uploading, setUploading] = useState<{ label: string } | null>(null);
  const [recording, setRecording] = useState<boolean>(false);

  const [threadOtherPresent, setThreadOtherPresent] = useState<boolean>(false);

  // Minimal (purely visual) call dock state
  const [callDockVisible, setCallDockVisible] = useState(false);
  const [callDockMin, setCallDockMin] = useState(false);
  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ended");
  const [callMode] = useState<"audio" | "video">("audio");

  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 920;
      g.gain.value = 0.001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
      o.stop(ctx.currentTime + 0.12);
    } catch {}
  }, [settings?.sound]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // resolve conversation + me
  useEffect(() => setConversationId(conversationIdProp ?? null), [conversationIdProp]);

  const ensureConversation = useCallback(async () => {
    const { data: au } = await supabase.auth.getUser();
    const uid = au.user?.id;
    if (!uid) throw new Error("Not authenticated");

    if (mode === "staff") {
      const pid = props.providerId!;
      setMe({ id: pid, name: props.providerName || "Me", role: props.providerRole! });
      if (conversationId) return conversationId;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("patient_id", props.patientId)
        .eq("provider_id", pid)
        .maybeSingle();

      if (conv?.id) { setConversationId(conv.id); return conv.id; }

      const { data: created, error: upErr } = await supabase
        .from("conversations")
        .upsert(
          { patient_id: props.patientId, provider_id: pid, provider_name: props.providerName ?? null, provider_role: props.providerRole ?? null },
          { onConflict: "patient_id,provider_id" }
        )
        .select("id")
        .single();
      if (upErr) throw upErr;
      setConversationId(created!.id);
      return created!.id;
    } else {
      setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
      if (conversationId) return conversationId;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("patient_id", uid)
        .eq("provider_id", props.providerId!)
        .maybeSingle();
      if (conv?.id) { setConversationId(conv.id); return conv.id; }

      const { data: created, error } = await supabase
        .from("conversations")
        .upsert(
          { patient_id: uid, provider_id: props.providerId!, provider_name: props.providerName ?? null, provider_role: props.providerRole ?? null },
          { onConflict: "patient_id,provider_id" }
        )
        .select("id")
        .single();
      if (error) throw error;
      setConversationId(created!.id);
      return created!.id;
    }
  }, [conversationId, mode, props.patientId, props.providerId, props.providerName, props.providerRole]);

  useEffect(() => { void ensureConversation().catch(console.error); }, [ensureConversation]);

  // initial load
  useLayoutEffect(() => {
    if (!conversationId || !me) return;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      setMsgs((data as MessageRow[]) ?? []);
      scrollToBottom(false);
      await markReadHelper(conversationId, me.role);
    })();
  }, [conversationId, me, scrollToBottom]);

  // live updates + typing
  useEffect(() => {
    if (!conversationId || !me) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`thread_${conversationId}`, { config: { presence: { key: me.id } } })
      .on("presence", { event: "sync" }, () => {
        const s = ch.presenceState();
        const others = Object.entries(s).flatMap(([, v]: any) => v) as any[];
        setTyping(others.some((x) => x.status === "typing"));
        setThreadOtherPresent(others.some((x) => x.user_id && x.user_id !== me.id));
      })
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${conversationId}` },
        async (p) => {
          const row = p.new as MessageRow;
          setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
          scrollToBottom(true);
          if (row.sender_id !== me.id) {
            ding();
            await markReadHelper(conversationId, me.role);
          }
        }
      )
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "UPDATE", filter: `conversation_id=eq.${conversationId}` },
        async () => {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
          setMsgs((data as MessageRow[]) ?? []);
        }
      )
      .subscribe();

    channelRef.current = ch;

    const refetch = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, me, ding, scrollToBottom]);

  // Determine peer user id (for building the /call URL only)
  const peerUserId = useMemo(
    () => (mode === "staff" ? patientId : (providerId || "")),
    [mode, patientId, providerId]
  );

  // Open /call page (no ring/signaling here)
  const beginCall = useCallback(
    async (m: "audio" | "video") => {
      const convId = await ensureConversation().catch(() => null);
      if (!convId || !peerUserId) return;
      const url = `/call/${convId}?role=caller&mode=${m}&peer=${encodeURIComponent(
        peerUserId
      )}&peerName=${encodeURIComponent(mode === "staff" ? (patientName || "Patient") : (providerName || "Provider"))}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setCallDockVisible(true);
      setCallStatus("connected"); // purely UI
    },
    [ensureConversation, peerUserId, mode, patientName, providerName]
  );

  const hangup = useCallback(async () => {
    // purely UI (no signaling)
    setCallDockVisible(false);
    setCallStatus("ended");
  }, []);

  /* ----------------------------- send ops ----------------------------- */
  async function insertMessage(payload: {
    content: string;
    attachment_url?: string | null;
    attachment_type?: "image" | "audio" | "file" | null;
  }) {
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
      meta: null,
    };
    setMsgs((m) => [...m, optimistic]);
    scrollToBottom(true);
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
    if (error) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      alert(`Failed to send.\n\n${error.message}`);
    }
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

  const canSend = useMemo(
    () => (!!text.trim() || !!draft) && !!me && !!conversationId,
    [text, me, conversationId, draft]
  );

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
        setDraft(null);
        setUploading(null);
        return;
      }
      await insertMessage({ content: contentText });
    } catch (err: any) {
      alert(`Failed to send.\n\n${err?.message ?? ""}`);
      setUploading(null);
    }
  }, [canSend, text, draft]);

  /* ------------------------------ helpers for content ------------------------------ */
  function shouldShowPlainContent(content?: string | null) {
    const t = (content ?? "").trim().toLowerCase();
    return !!t && t !== "(image)" && t !== "(photo)" && t !== "(voice note)";
  }
  function extractImageUrlFromContent(content?: string | null) {
    if (!content) return null;
    try {
      const maybe = JSON.parse(content);
      if (maybe && typeof maybe === "object" && (maybe as any).type === "image" && typeof (maybe as any).url === "string")
        return (maybe as any).url as string;
    } catch {}
    const match = content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|heic|svg)(?:\?\S*)?/i);
    return match?.[0] ?? null;
  }
  function isHttp(u?: string | null) {
    return !!u && /^https?:\/\//i.test(u);
  }
  async function toUrlFromPath(path: string) {
    try {
      const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60 * 24);
      if (data?.signedUrl) return data.signedUrl;
    } catch {}
    try {
      const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
      return pub?.data?.publicUrl ?? null;
    } catch {
      return null;
    }
  }

  const isOnline = mode === "staff" ? threadOtherPresent : false;
  const otherName = mode === "staff" ? (patientName || "Patient") : (providerName || "Provider");
  const otherAvatar = mode === "staff" ? (patientAvatarUrl ?? null) : (providerAvatarUrl ?? null);

  return (
    <Card className="h-[620px] w-full overflow-hidden border-0 shadow-lg">
      <CardContent className="flex h-full flex-col p-0">
        {/* Header */}
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
                <span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">{otherName}</div>
              <div className="flex items-center gap-1 text-[11px]">
                {mode === "staff" ? (
                  <>
                    <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <span className={isOnline ? "text-emerald-600" : "text-gray-500"}>{isOnline ? "Online" : "Offline"}</span>
                  </>
                ) : (
                  <span className="text-gray-500">{providerRole || ""}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <IconButton
              aria="Voice call"
              onClick={() => (phoneHref ? window.open(phoneHref, "_blank") : beginCall("audio"))}
            >
              <Phone className="h-5 w-5" />
            </IconButton>
            <IconButton
              aria="Video call"
              onClick={() => (videoHref ? window.open(videoHref, "_blank") : beginCall("video"))}
            >
              <Video className="h-5 w-5" />
            </IconButton>
            <IconButton aria="More">
              <MoreVertical className="h-5 w-5" />
            </IconButton>
          </div>
        </div>

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
        <div className="border-t bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70">
          <div className="mx-auto flex max-w-xl items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <IconButton aria="Emoji picker">
                    <Smile className="h-5 w-5" />
                  </IconButton>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Pick an emoji</DialogTitle>
                  </DialogHeader>
                  <EmojiGrid onPick={(e) => setText((v) => v + e)} />
                </DialogContent>
              </Dialog>

              <IconButton aria="Attach image" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="h-5 w-5" />
              </IconButton>
              <input ref={fileInputRef} type="file" accept="image/*,audio/*" hidden onChange={onPickFile} />
              <IconButton aria="Camera" onClick={takePhoto}>
                <Camera className="h-5 w-5" />
              </IconButton>
              <IconButton aria="Voice note" onClick={toggleRecord}>
                <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
              </IconButton>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                const enterToSend = settings?.enterToSend ?? true;
                if (e.key === "Enter" && !e.shiftKey && enterToSend) {
                  e.preventDefault();
                  void send();
                }
              }}
              onPaste={onPaste}
              placeholder="Type your message…"
              className={`min-h=[46px] max-h-[140px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700 ${settings?.density === "compact" ? "text-sm" : ""}`}
            />

            <Button disabled={!canSend} onClick={send} className="h-11 rounded-2xl px-4 shadow-md" aria-busy={!!uploading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Tiny call dock (purely visual now) */}
      {callDockVisible && (
        <CallDock
          minimized={callDockMin}
          onToggleMin={() => setCallDockMin((v) => !v)}
          status={callStatus}
          mode={callMode}
          name={mode === "staff" ? (patientName || "Patient") : (providerName || "Provider")}
          avatar={(mode === "staff" ? patientAvatarUrl : providerAvatarUrl) ?? undefined}
          onOpen={() => {}}
          onHangup={hangup}
        />
      )}
    </Card>
  );

  /* -------------- media pick/record -------------- */
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !me || !conversationId) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10 MB).");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" =
      file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }
  async function takePhoto() {
    if (!me || !conversationId) return;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      (video as any).muted = true;
      video.srcObject = stream as any;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = (video as any).videoWidth || 640;
      canvas.height = (video as any).videoHeight || 480;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("No photo"))), "image/jpeg", 0.9)!
      );
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (e: any) {
      alert(`Camera error.\n\n${e?.message ?? ""}`);
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }
  async function toggleRecord() {
    if (recording) {
      mediaRecRef.current?.stop();
      return;
    }
    if (!me || !conversationId) return;
    if (typeof window.MediaRecorder === "undefined") {
      alert("Voice recording isn’t supported by this browser.");
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("Microphone permission denied.");
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "audio", name: "voice.webm", previewUrl });
    };
    mediaRecRef.current = rec;
    setRecording(true);
    rec.start();
  }
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(e.clipboardData.files || [])[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault();
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10 MB).");
        return;
      }
      const url = URL.createObjectURL(file);
      setDraft({ blob: file, type: "image", name: file.name || "pasted.jpg", previewUrl: url });
    }
  }
}

/* ------------------------------ Small helpers ------------------------------ */

function IconButton({
  children,
  aria,
  onClick,
}: {
  children: React.ReactNode;
  aria: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className="rounded-full p-2 hover:bg-gray-100 active:scale-95 dark:hover:bg-zinc-800"
    >
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
              <button
                key={e}
                onClick={() => onPick(e)}
                className="rounded-md border p-2 text-xl hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  m,
  own,
  bubbleBase,
  shouldShowPlainContent,
  extractImageUrlFromContent,
  isHttp,
  toUrlFromPath,
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
      if (m.meta?.image_path) {
        const url = isHttp(m.meta.image_path) ? m.meta.image_path : await toUrlFromPath(m.meta.image_path);
        if (!cancelled) setAttUrl(url);
        return;
      }
      if (m.meta?.audio_path) {
        const url = isHttp(m.meta.audio_path) ? m.meta.audio_path : await toUrlFromPath(m.meta.audio_path);
        if (!cancelled) setAttUrl(url);
        return;
      }
      if (m.attachment_url) {
        if (isHttp(m.attachment_url)) {
          if (!cancelled) setAttUrl(m.attachment_url);
        } else {
          const url = await toUrlFromPath(m.attachment_url);
          if (!cancelled) setAttUrl(url);
        }
        return;
      }
      const fromContent = extractImageUrlFromContent(m.content);
      if (!cancelled) setAttUrl(fromContent || null);
    })();
    return () => { cancelled = true; };
  }, [
    m.id,
    m.meta?.image_path,
    m.meta?.audio_path,
    m.attachment_type,
    m.attachment_url,
    m.content,
    isHttp,
    toUrlFromPath,
    extractImageUrlFromContent,
  ]);

  const showText = shouldShowPlainContent(m.content);
  const mediaKind: "image" | "audio" | "file" | null =
    m.meta?.image_path ? "image" : m.meta?.audio_path ? "audio" : m.attachment_type ?? null;

  return (
    <div className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
      {!own && (
        <div className="hidden h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200 sm:block">
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-600">
            {(m.sender_name || "?").slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      <div className={`max-w-[82%] sm:max-w-[70%] ${bubble}`}>
        {mediaKind === "image" && attUrl && (
          <img src={attUrl} alt="image" className="mb-2 max-h-64 w-full rounded-xl object-cover" onError={() => setAttUrl(null)} />
        )}
        {mediaKind === "audio" && attUrl && (
          <audio className="mb-2 w-full" controls src={attUrl} onError={() => setAttUrl(null)} />
        )}
        {mediaKind === "file" && attUrl && (
          <a className="mb-2 block underline" href={attUrl} target="_blank" rel="noreferrer">
            Download file
          </a>
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

function CallDock(props: {
  minimized: boolean;
  onToggleMin: () => void;
  status: "ringing" | "connected" | "ended";
  mode: "audio" | "video";
  name: string;
  avatar?: string;
  onOpen: () => void;
  onHangup: () => void;
}) {
  const { minimized, onToggleMin, status, mode, name, avatar, onOpen, onHangup } = props;
  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[280px] rounded-xl border bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      role="dialog"
      aria-label="Call window"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-gray-200 dark:ring-zinc-700">
          {avatar ? (
            <img src={avatar} className="h-full w-full object-cover" alt="" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cyan-100 text-cyan-700">
              {(name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="text-xs text-gray-500 capitalize">{mode} • {status}</div>
        </div>
        <button type="button" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800" title={minimized ? "Expand" : "Minimize"} onClick={onToggleMin}>
          {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>
      </div>

      {!minimized && (
        <div className="mt-3 flex items-center justify-between">
          <button type="button" className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={onOpen}>
            <Monitor className="h-4 w-4" /> Open call
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border px-2 py-1.5 text-sm hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => {}} title="Mute (use controls in the dialog)">
              <Volume2 className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700" onClick={onHangup} title="Hang up">
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
app/dashboard/messages/page.tsx
tsx
Copy code
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Phone,
  Video,
  Send,
  Image as ImageIcon,
  Camera,
  Mic,
  MessageCircle,
  Search,
  Plus,
  X,
  Users,
} from "lucide-react";
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
  meta?: MessageMeta | null;
  attachment_url?: string | null;
  attachment_type?: "image" | "audio" | "file" | null;
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
  return s
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------ Page (PATIENT) -------------------------- */
export default function DashboardMessagesPage() {
  const router = useRouter();

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<{
    blob: Blob;
    type: "image" | "audio" | "file";
    name?: string;
    previewUrl: string;
    duration_sec?: number;
  } | null>(null);
  useEffect(() => () => { if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); }, [draft?.previewUrl]);

  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<"convs" | "staff">("convs");

  /* ------------------------- Auth ------------------------ */
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) {
        location.href = "/login";
        return;
      }
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

  /* ------------------------ Load convos ------------------ */
  const reloadConversations = useCallback(async (patientId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at"
      )
      .eq("patient_id", patientId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      await Swal.fire("Load error", error.message, "error");
      return;
    }
    setConvs((data as Conversation[]) || []);
  }, []);
  useEffect(() => { if (me?.id) void reloadConversations(me.id); }, [me?.id, reloadConversations]);

  /* ----------------------------- Staff dir ------------------------- */
  const fetchStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("user_id, first_name, last_name, email, role, phone, avatar_url")
      .order("first_name", { ascending: true });
    if (error) {
      await Swal.fire("Load error", error.message, "error");
      return;
    }
    setStaffDir((data as StaffRow[]) || []);
  }, []);
  useEffect(() => { if (me) void fetchStaff(); }, [me, fetchStaff]);

  /* --------- Thread subscribe ----------- */
  useEffect(() => {
    if (!selectedId || !me) return;
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
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
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as MessageRow]);
          requestAnimationFrame(() =>
            listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" })
          );
        }
      );
    void ch.subscribe();

    const ping = () => { try { ch.track({ user_id: me.id, at: Date.now() }); } catch {} };
    const keepAlive = setInterval(ping, 1500);
    ping();

    return () => {
      alive = false;
      clearInterval(keepAlive);
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [selectedId, me]);

  /* --------------------------------- STAFF → CONVERSATION -------------------------------- */
  async function ensureConversationWith(providerUserId: string) {
    if (!me?.id) return;
    const staff = staffDir.find((s) => s.user_id === providerUserId);
    const provider_name =
      [staff?.first_name, staff?.last_name].filter(Boolean).join(" ") || staff?.email || "Staff";

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
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { await Swal.fire("Too large", "Choose a file under 10 MB.", "info"); return; }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" = file.type.startsWith("image/")
      ? "image" : file.type.startsWith("audio/") ? "audio" : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }
  async function takePhoto() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      (video as any).muted = true;
      video.srcObject = stream as any;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = (video as any).videoWidth || 640;
      canvas.height = (video as any).videoHeight || 480;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
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
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { await Swal.fire("Permission", "Microphone permission denied.", "info"); return; }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
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
    rec.start();
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
          const path = await chatUploadToPath(draft.blob, { conversationId: selectedId, kind: "image", fileName: draft.name || "image.jpg" });
          meta = { image_path: path, duration_sec: null };
        } else if (draft.type === "audio") {
          const path = await chatUploadToPath(draft.blob, { conversationId: selectedId, kind: "audio", fileName: draft.name || "voice.webm" });
          meta = { audio_path: path, duration_sec: draft.duration_sec ?? null };
        } else meta = {};
      }
    } catch (e: any) {
      await Swal.fire("Upload failed", e.message || "Could not upload media.", "error");
      setSending(false);
      return;
    }
    const content = caption || (meta?.audio_path ? "(voice note)" : meta?.image_path ? "(image)" : "");
    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: me.id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content,
      read: false,
      urgent: false,
      meta,
    });
    if (insErr) { await Swal.fire("Send failed", insErr.message, "error"); setSending(false); return; }
    setCompose("");
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
    await supabase
      .from("conversations")
      .update({ last_message: content || "", last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
    setSending(false);
  }

  /* ------------------------------ CALLING (navigate to /call) -------------------------------- */

  const selectedConv = useMemo(
    () => convs.find((c) => c.id === selectedId) || null,
    [convs, selectedId]
  );
  const providerInfo = useMemo(() => {
    const s = staffDir.find((x) => x.user_id === selectedConv?.provider_id);
    const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
    return { id: s?.user_id || selectedConv?.provider_id || "", name, avatar: s?.avatar_url ?? undefined };
  }, [staffDir, selectedConv?.provider_id]);

  const startCall = useCallback(
    async (mode: "audio" | "video") => {
      if (!selectedId || !me?.id) {
        await Swal.fire("Select a chat", "Open a conversation first.", "info");
        return;
      }
      const peerUserId = providerInfo.id;
      if (!peerUserId) {
        await Swal.fire("Unavailable", "No peer available for this conversation.", "info");
        return;
      }
      router.push(
        `/call/${selectedId}?role=caller&mode=${mode}&peer=${encodeURIComponent(peerUserId)}&peerName=${encodeURIComponent(providerInfo.name || "Contact")}`
      );
    },
    [selectedId, me?.id, providerInfo.id, providerInfo.name, router]
  );

  /* ------------------------------ Lists / filters ------------------------------ */
  const search = q.trim().toLowerCase();
  const convsSorted = useMemo(
    () =>
      [...convs].sort((a, b) =>
        (b.last_message_at || b.created_at || "").localeCompare(a.last_message_at || a.created_at || "")
      ),
    [convs]
  );
  const filteredConvs = useMemo(
    () =>
      convsSorted.filter((c) => {
        const s = staffDir.find((x) => x.user_id === c.provider_id);
        const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
        return search ? name.toLowerCase().includes(search) : true;
      }),
    [convsSorted, staffDir, search]
  );
  const filteredStaff = useMemo(
    () =>
      search
        ? staffDir.filter((s) => {
            const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "";
            return name.toLowerCase().includes(search) || (s.role || "").toLowerCase().includes(search);
          })
        : staffDir,
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
            <div className="mb-3 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div className="font-medium">Conversations</div>
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant={sidebarTab === "convs" ? "default" : "outline"} onClick={() => setSidebarTab("convs")}>
                  Chats
                </Button>
                <Button size="sm" variant={sidebarTab === "staff" ? "default" : "outline"} onClick={() => setSidebarTab("staff")}>
                  <Users className="mr-1 h-4 w-4" /> Staff
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={sidebarTab === "convs" ? "Search conversations…" : "Search staff…"}
                className="pl-10"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 divide-y overflow-y-auto dark:divide-zinc-800">
            {sidebarTab === "convs"
              ? filteredConvs.map((c) => {
                  const s = staffDir.find((x) => x.user_id === c.provider_id);
                  const name = [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || "Staff";
                  const avatar = s?.avatar_url ?? undefined;
                  const active = selectedId === c.id;
                  return (
                    <button
                      key={`conv-${c.id}`}
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 ${
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
                            {new Date(c.last_message_at ?? c.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {c.provider_role ?? "staff"}
                          </Badge>
                          <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              : filteredStaff.map((s) => {
                  const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Staff";
                  return (
                    <button
                      key={`staff-${s.user_id}`}
                      onClick={() => ensureConversationWith(s.user_id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900"
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
                })}
            {sidebarTab === "convs" && filteredConvs.length === 0 && <div className="p-4 text-sm text-gray-500">No conversations yet.</div>}
            {sidebarTab === "staff" && filteredStaff.length === 0 && <div className="p-4 text-sm text-gray-500">No staff found.</div>}
          </div>
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 flex min-h-0 flex-col rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <div className="text-lg font-medium">Select a conversation or pick a staff to start</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-zinc-800">
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

              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950"
              >
                {msgs.map((m) => {
                  const own = m.sender_id === me?.id;
                  const bubble = own
                    ? "bg-cyan-500 text-white rounded-2xl px-4 py-2 shadow-sm"
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
                {msgs.length === 0 && <div className="py-6 text-center text-sm text-gray-500">No messages yet.</div>}
              </div>

              {/* Composer */}
              <div className="sticky bottom-0 border-t bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 supports-[backdrop-filter]:bg-white/70">
                {draft && (
                  <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border bg-white p-2 pr-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="max-h-20 max-w-[180px] overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-zinc-700">
                      {draft.type === "image" && <img src={draft.previewUrl} alt="preview" className="h-20 w-auto object-cover" />}
                      {draft.type === "audio" && <audio controls src={draft.previewUrl} className="h-10 w-[180px]" />}
                      {draft.type === "file" && <div className="p-3">📎 {draft.name || "file"}</div>}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button onClick={send} disabled={!canSend} className="h-11 shrink-0 rounded-2xl px-4 shadow-md" aria-busy={sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
