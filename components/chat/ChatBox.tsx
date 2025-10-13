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
import IncomingCallBanner from "@/components/call/IncomingCallBanner";

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

  // Incoming call banner state
  const [incoming, setIncoming] = useState<{
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: "audio" | "video";
  } | null>(null);

  // Visual call dock (optional)
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
    ((settings?.density ?? "comfortable") === "compact" ? "text-sm" : "text-[15px]"));

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

  /* ---------------------------- INVITE listener (banner) ---------------------------- */
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      ch = supabase.channel(`user_${uid}`, { config: { broadcast: { ack: true } } });
      ch.on("broadcast", { event: "invite" }, (p) => {
        const { conversationId: convId, fromId, fromName, mode } = (p.payload || {}) as any;
        if (!convId || !fromId) return;
        // only show banner for the current thread (to avoid confusion)
        if (conversationId && convId !== conversationId) return;
        setIncoming({ conversationId: convId, fromId, fromName: fromName || "Caller", mode: (mode || "audio") });
      });
      ch.on("broadcast", { event: "bye" }, () => setIncoming(null));
      ch.subscribe();
    })();
    return () => { if (ch) try { supabase.removeChannel(ch); } catch {} };
  }, [conversationId]);

  // Determine peer user id (build /call URL)
  const peerUserId = useMemo(
    () => (mode === "staff" ? patientId : (providerId || "")),
    [mode, patientId, providerId]
  );

  // Start call (navigate; /call page does the signaling)
  const beginCall = useCallback(
    async (m: "audio" | "video") => {
      const convId = (await ensureConversation().catch(() => null)) || conversationId;
      if (!convId || !peerUserId) return;
      const url = `/call/${convId}?role=caller&mode=${m}&peer=${encodeURIComponent(
        peerUserId
      )}&peerName=${encodeURIComponent(mode === "staff" ? (patientName || "Patient") : (providerName || "Provider"))}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setCallDockVisible(true);
      setCallStatus("connected"); // visual only
    },
    [ensureConversation, conversationId, peerUserId, mode, patientName, providerName]
  );

  // Accept/Decline banner
  const acceptIncoming = useCallback(() => {
    if (!incoming) return;
    const url = `/call/${incoming.conversationId}?role=callee&mode=${incoming.mode}&peer=${encodeURIComponent(
      incoming.fromId
    )}&peerName=${encodeURIComponent(incoming.fromName || "Caller")}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setIncoming(null);
  }, [incoming]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    const ch = supabase.channel(`user_${incoming.fromId}`, { config: { broadcast: { ack: true } } });
    await new Promise<void>((res) => ch.subscribe((s) => s === "SUBSCRIBED" && res()));
    await ch.send({ type: "broadcast", event: "bye", payload: { conversationId: incoming.conversationId } });
    setIncoming(null);
  }, [incoming]);

  const hangup = useCallback(() => {
    setCallDockVisible(false);
    setCallStatus("ended");
  }, []);

  /* ------------------------------ UI ------------------------------ */

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

        {/* Incoming call banner (top of thread area) */}
        {incoming && (
          <div className="px-3 pt-2">
            <IncomingCallBanner
              callerName={incoming.fromName}
              mode={incoming.mode}
              onAccept={acceptIncoming}
              onDecline={declineIncoming}
            />
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
        <div className="border-t bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70">
          <div className="mx-auto flex max-w-xl items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <IconButton aria="Emoji picker">
                    <Smile className="h-5 w-5" />
                  </IconButton>
                </DialogTrigger>
                <DialogContent className="max-w-sm" aria-describedby="emoji-picker-desc">
                  <DialogHeader>
                    <DialogTitle>Pick an emoji</DialogTitle>
                    <p id="emoji-picker-desc" className="sr-only">Insert an emoji into your message</p>
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

      {/* Tiny call dock (visual) */}
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
  disabled,
}: {
  children: React.ReactNode;
  aria: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full p-2 hover:bg-gray-100 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed dark:hover:bg-zinc-800"
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
