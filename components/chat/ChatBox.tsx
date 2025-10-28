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

const CHAT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET?.trim() || "chat";

/* ----------------------------- Zoom helpers (client) ----------------------------- */
/** Why popup: isolates OAuth and keeps tokens server-only via HttpOnly cookies */
function openPopup(url: string, title = "Zoom OAuth", w = 520, h = 640) {
  const y = window.top?.outerHeight ? (window.top.outerHeight - h) / 2 : 100;
  const x = window.top?.outerWidth ? (window.top.outerWidth - w) / 2 : 100;
  const popup = window.open(
    url,
    title,
    `popup=yes,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},top=${y},left=${x}`
  );
  if (!popup) throw new Error("Popup blocked");
  return popup;
}
/** Why: credentials include cookies carrying session */
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
/** Minimal Zoom glyph (theme via fill class) */
function ZoomGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...props}>
      <rect width="256" height="256" rx="48" />
      <path
        d="M58 90c0-8 6-14 14-14h76c18 0 32 14 32 32v40c0 8-6 14-14 14H90c-18 0-32-14-32-32V90zM188 110l44-26c7-4 16 1 16 9v70c0 8-9 13-16 9l-44-26v-36z"
        fill="white"
      />
    </svg>
  );
}

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

  const [conversationId, setConversationId] = useState<string | null>(
    conversationIdProp ?? null
  );
  const [me, setMe] = useState<{
    id: string;
    name: string;
    role: "patient" | Provider;
  } | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const [uploading, setUploading] = useState<{ label: string } | null>(null);
  const [recording, setRecording] = useState<boolean>(false);

  const [threadOtherPresent, setThreadOtherPresent] =
    useState<boolean>(false);

  // Minimal (purely visual) call dock state
  const [callDockVisible, setCallDockVisible] = useState(false);
  const [callDockMin, setCallDockMin] = useState(false);
  const [callStatus, setCallStatus] =
    useState<"ringing" | "connected" | "ended">("ended");
  const [callMode] = useState<"audio" | "video">("audio");


  const listRef = useRef<HTMLDivElement>(null);
  const channelRef =
    useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [draft, setDraft] = useState<{
    blob: Blob;
    type: "image" | "audio" | "file";
    name?: string;
    previewUrl: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    },
    [draft?.previewUrl]
  );

  const bubbleBase =
    (settings?.bubbleRadius ?? "rounded-2xl") +
    " px-4 py-2 " +
    ((settings?.density ?? "comfortable") === "compact"
      ? "text-sm"
      : "text-[15px]");

  const ding = useCallback(() => {
    if (!settings?.sound) return;
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 920;
      g.gain.value = 0.001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(
        0.00001,
        ctx.currentTime + 0.12
      );
      o.stop(ctx.currentTime + 0.12);
    } catch {
      /* ignore */
    }
  }, [settings?.sound]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // resolve conversation + me
  useEffect(
    () => setConversationId(conversationIdProp ?? null),
    [conversationIdProp]
  );

  const ensureConversation = useCallback(async () => {
    const { data: au } = await supabase.auth.getUser();
    const uid = au.user?.id;
    if (!uid) throw new Error("Not authenticated");

    if (mode === "staff") {
      const pid = props.providerId!;
      setMe({
        id: pid,
        name: props.providerName || "Me",
        role: props.providerRole!,
      });
      if (conversationId) return conversationId;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("patient_id", props.patientId)
        .eq("provider_id", pid)
        .maybeSingle();

      if (conv?.id) {
        setConversationId(conv.id);
        return conv.id;
      }

      const { data: created, error: upErr } = await supabase
        .from("conversations")
        .upsert(
          {
            patient_id: props.patientId,
            provider_id: pid,
            provider_name: props.providerName ?? null,
            provider_role: props.providerRole ?? null,
          },
          { onConflict: "patient_id,provider_id" }
        )
        .select("id")
        .single();
      if (upErr) throw upErr;
      setConversationId(created!.id);
      return created!.id;
    } else {
      setMe({
        id: uid,
        name: au.user?.email || "Me",
        role: "patient",
      });
      if (conversationId) return conversationId;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("patient_id", uid)
        .eq("provider_id", props.providerId!)
        .maybeSingle();
      if (conv?.id) {
        setConversationId(conv.id);
        return conv.id;
      }

      const { data: created, error } = await supabase
        .from("conversations")
        .upsert(
          {
            patient_id: uid,
            provider_id: props.providerId!,
            provider_name: props.providerName ?? null,
            provider_role: props.providerRole ?? null,
          },
          { onConflict: "patient_id,provider_id" }
        )
        .select("id")
        .single();
      if (error) throw error;
      setConversationId(created!.id);
      return created!.id;
    }
  }, [
    conversationId,
    mode,
    props.patientId,
    props.providerId,
    props.providerName,
    props.providerRole,
  ]);

  useEffect(() => {
    void ensureConversation().catch(console.error);
  }, [ensureConversation]);

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
      .channel(`thread_${conversationId}`, {
        config: { presence: { key: me.id } },
      })
      .on("presence", { event: "sync" }, () => {
        const s = ch.presenceState();
        const others = Object.entries(s).flatMap(
          ([, v]: any) => v
        ) as any[];
        setTyping(others.some((x) => x.status === "typing"));
        setThreadOtherPresent(
          others.some((x) => x.user_id && x.user_id !== me.id)
        );
      })
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "messages",
          event: "INSERT",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (p) => {
          const row = p.new as MessageRow;
          setMsgs((prev) =>
            prev.some((x) => x.id === row.id) ? prev : [...prev, row]
          );
          scrollToBottom(true);
          if (row.sender_id !== me.id) {
            ding();
            await markReadHelper(conversationId, me.role);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "messages",
          event: "UPDATE",
          filter: `conversation_id=eq.${conversationId}`,
        },
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
    () => (mode === "staff" ? patientId : providerId || ""),
    [mode, patientId, providerId]
  );

  // ---------- Inline signaling helpers (invite/bye) ----------
  async function ensureSubscribedFor(
    userChannel: ReturnType<typeof supabase.channel>
  ) {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(
        () => reject(new Error("subscribe timeout")),
        10000
      );
      userChannel.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          clearTimeout(to);
          resolve();
        }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          clearTimeout(to);
          reject(new Error(String(s)));
        }
      });
    });
  }
  async function ringPeer(
    toUserId: string,
    args: {
      conversationId: string;
      fromId: string;
      fromName: string;
      mode: "audio" | "video";
    }
  ) {
    try {
      // Send to both user channel and staff-specific channel
      const userChannel = supabase.channel(`user_${toUserId}`, {
        config: { broadcast: { ack: true } },
      });
      const staffChannel = supabase.channel(`staff-calls-${toUserId}`, {
        config: { broadcast: { ack: true } },
      });
      
      await ensureSubscribedFor(userChannel);
      await ensureSubscribedFor(staffChannel);
      
      // Send to user channel (for general notifications)
      const userResponse = await userChannel.send({
        type: "broadcast",
        event: "invite",
        payload: args,
      });
      
      // Send to staff channel (for incoming call banner)
      const staffResponse = await staffChannel.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          conversationId: args.conversationId,
          callerId: args.fromId,
          callerName: args.fromName,
          mode: args.mode,
          timestamp: new Date().toISOString(),
        },
      });
      
      if (userResponse !== "ok" && staffResponse !== "ok") {
        console.warn('Failed to send invite notification, but continuing...');
      }
  } catch (error) {
    // Don't throw - non-critical, just log
    console.warn('[ringPeer] Failed to send ring notification:', error);
  }
  async function sendBye(
    toUserId: string,
    args: { conversationId: string }
  ) {
    const ch = supabase.channel(`user_${toUserId}`, {
      config: { broadcast: { ack: true } },
    });
    await ensureSubscribedFor(ch);
    const response = await ch.send({
      type: "broadcast",
      event: "bye",
      payload: args,
    });
    if (response !== "ok") throw new Error("Failed to send bye");
  }

  // Open /call page and RING the peer so they see a banner
  const beginCall = useCallback(
    async (m: "audio" | "video") => {
      const convId = await ensureConversation().catch(() => null);
      if (!convId || !peerUserId || !me?.id) return;

      // Create Zoho Meeting link and send as message
      try {
        const response = await fetch('/api/zoho-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: convId,
            patientName: mode === "staff" ? (patientName || "Patient") : me.name,
            staffName: mode === "staff" ? me.name : (providerName || "Staff")
          })
        });

        const data = await response.json();
        
        // Check if configuration is needed
        if (data.needsConfig) {
          console.warn('Zoho Meeting not configured:', data.configMessage);
          alert('⚠️ Zoho Meeting is not configured. Please visit /zoho-setup to configure your meeting room URL.');
          return;
        }
        
        if (data.meetingUrl) {
          // Send meeting link as a message
          const meetingMessage = `📞 Starting ${m} call\n\nJoin the meeting:\n🔗 [Click to join](${data.meetingUrl})`;
          
          // Send message to conversation using the actual send function
          try {
            await sendMessage({
              content: meetingMessage,
              caption: meetingMessage,
              meta: null,
              conversationId: convId
            });
          } catch (sendError) {
            console.error('Failed to send meeting link message:', sendError);
          }
          
          // Open Zoho Meeting in new tab
          window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('Failed to create Zoho Meeting:', error);
      }

      try {
        await ringPeer(peerUserId, {
          conversationId: convId,
          fromId: me.id,
          fromName:
            me.name ||
            (mode === "staff"
              ? providerName || "Staff"
              : patientName || "Patient"),
          mode: m,
        });
      } catch (e) {
        // Why: non-blocking ring; still open call
        console.warn("[call] ring failed", e);
      }

      setCallDockVisible(true);
      setCallStatus("ringing");
    },
    [
      ensureConversation,
      peerUserId,
      mode,
      patientName,
      providerName,
      me?.id,
      me?.name,
      sendMessage,
    ]
  );

  const hangup = useCallback(async () => {
    if (conversationId && peerUserId) {
      try {
        await sendBye(peerUserId, { conversationId });
      } catch (e) {
        console.warn("[call] bye failed", e);
      }
    }
      setCallDockVisible(false);
      setCallStatus("ended");
    }, [conversationId, peerUserId]);

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
    const detected =
      (fileOrBlob as File).type || (fileOrBlob as any).type || "";
    const extFromName = (fileName || "").split(".").pop() || "";
    const ext =
      extFromName ||
      (detected.startsWith("image/")
        ? detected.split("/")[1]
        : detected
        ? "webm"
        : "bin");
    const path = `${conversationId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(CHAT_BUCKET)
      .upload(path, fileOrBlob, {
        contentType: detected || "application/octet-stream",
        upsert: false,
      });
    if (upErr) {
      if (/not found/i.test(upErr.message))
        throw new Error(`Bucket "${CHAT_BUCKET}" not found.`);
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
          draft.name ||
            (draft.type === "image"
              ? "image.jpg"
              : draft.type === "audio"
              ? "voice.webm"
              : "file.bin")
        );
        const content =
          draft.type === "audio"
            ? contentText || "(voice note)"
            : contentText;
        await insertMessage({
          content: content || "",
          attachment_url: storagePath,
          attachment_type: draft.type,
        });
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
      if (
        maybe &&
        typeof maybe === "object" &&
        (maybe as any).type === "image" &&
        typeof (maybe as any).url === "string"
      )
        return (maybe as any).url as string;
    } catch {
      /* ignore */
    }
    const match = content.match(
      /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|heic|svg)(?:\?\S*)?/i
    );
    return match?.[0] ?? null;
  }
  function isHttp(u?: string | null) {
    return !!u && /^https?:\/\//i.test(u);
  }
  async function toUrlFromPath(path: string) {
    try {
      const { data } = await supabase.storage
        .from(CHAT_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24);
      if (data?.signedUrl) return data.signedUrl;
    } catch {
      /* ignore */
    }
    try {
      const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
      return pub?.data?.publicUrl ?? null;
    } catch {
      return null;
    }
  }

  const isOnline = mode === "staff" ? threadOtherPresent : false;
  const otherName =
    mode === "staff" ? patientName || "Patient" : providerName || "Provider";
  const otherAvatar =
    mode === "staff" ? patientAvatarUrl ?? null : providerAvatarUrl ?? null;

  /* ------------------------------ Zoom UI state + actions ------------------------------ */
  const [zoomConnecting, setZoomConnecting] = useState(false);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);

  // On mount, check connection status from server (HttpOnly cookie)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getJSON<{ connected: boolean }>("/api/zoom/status");
        if (!cancelled) setZoomConnected(!!s.connected);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Launch OAuth in popup; await postMessage from /api/zoom/oauth/callback
  const startZoomAuth = useCallback(() => {
    setZoomConnecting(true);
    setZoomError(null);
    let popup: Window | null = null;
    try {
      popup = openPopup(`/api/zoom/oauth/start`);
    } catch (e: any) {
      setZoomConnecting(false);
      setZoomError(e?.message || "Popup blocked");
      setZoomModalOpen(true);
      return;
    }

    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return; // why: origin check
      const data = ev.data || {};
      if (data?.type === "ZOOM_OAUTH_RESULT") {
        window.removeEventListener("message", onMsg);
        setZoomConnecting(false);
        if (data.ok) {
          setZoomConnected(true);
          setZoomError(null);
        } else {
          setZoomConnected(false);
          setZoomError(data.error || "Authorization failed");
        }
        setZoomModalOpen(true);
        try {
          popup?.close();
        } catch {}
      }
    };
    window.addEventListener("message", onMsg);
  }, []);

  /* ----------------------------------- UI ----------------------------------- */
  return (
    <Card className="h-[620px] w-full overflow-hidden border-0 shadow-lg">
      <CardContent className="flex h-full flex-col p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                onClick={onBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
              {otherAvatar ? (
                <img
                  src={otherAvatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-cyan-100 text-cyan-700">
                  {(otherName || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              {mode === "staff" && (
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${
                    isOnline ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">{otherName}</div>
              <div className="flex items-center gap-1 text-[11px]">
                {mode === "staff" ? (
                  <>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        isOnline ? "bg-emerald-500" : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={isOnline ? "text-emerald-600" : "text-gray-500"}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">{providerRole || ""}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Zoom connect button */}
            <IconButton aria="Connect Zoom" onClick={startZoomAuth}>
              <ZoomGlyph
                className={`h-5 w-5 ${
                  zoomConnected
                    ? "fill-emerald-600"
                    : "fill-[#0B5CFF] dark:fill-[#75A2FF]"
                }`}
              />
            </IconButton>

            <IconButton
              aria="Voice call"
              onClick={() =>
                phoneHref
                  ? window.open(phoneHref, "_blank")
                  : beginCall("audio")
              }
            >
              <Phone className="h-5 w-5" />
            </IconButton>

            <IconButton
              aria="Video call"
              onClick={() => beginCall("video")}
            >
              <Video className="h-5 w-5" />
            </IconButton>
            
          </div>
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950"
        >
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
            {typing && (
              <div className="px-1 text-xs text-gray-500">…typing</div>
            )}
            {msgs.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                No messages yet. Say hello 👋
              </div>
            )}
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

              <IconButton
                aria="Attach image"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*"
                hidden
                onChange={onPickFile}
              />
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
              className={`min-h=[46px] max-h-[140px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700 ${
                settings?.density === "compact" ? "text-sm" : ""
              }`}
            />

            <Button
              disabled={!canSend}
              onClick={send}
              className="h-11 rounded-2xl px-4 shadow-md"
              aria-busy={!!uploading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Tiny call dock */}
      {callDockVisible && (
        <CallDock
          minimized={callDockMin}
          onToggleMin={() => setCallDockMin((v) => !v)}
          status={callStatus}
          mode={callMode}
          name={
            mode === "staff" ? patientName || "Patient" : providerName || "Provider"
          }
          avatar={
            (mode === "staff" ? patientAvatarUrl : providerAvatarUrl) ?? undefined
          }
          onOpen={() => {}}
          onHangup={hangup}
        />
      )}

      {/* Zoom connection status modal */}
      <Dialog open={zoomModalOpen} onOpenChange={setZoomModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zoom connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div>App: <span className="font-mono">OAuth</span></div>
              <div
                className={`rounded-full px-2 py-0.5 text-xs ${
                  zoomConnected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {zoomConnected ? "Connected" : "Not connected"}
              </div>
            </div>
            {zoomConnecting && <div>Waiting for authorization…</div>}
            {zoomError && <div className="text-rose-600">{zoomError}</div>}
            {!zoomConnected && !zoomConnecting && (
              <div className="text-gray-600">
                Click the Zoom icon to connect your account.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
    const kind: "image" | "audio" | "file" = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("audio/")
      ? "audio"
      : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }
  async function takePhoto() {
    if (!me || !conversationId) return;
    let stream: MediaStream | null = null;
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
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
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("No photo"))),
          "image/jpeg",
          0.9
        )!
      );
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (e: any) {
      console.error('Camera error in takePhoto:', e);
      
      // Provide more specific error messages
      let errorMessage = 'Camera error.';
      if (e?.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access and try again.';
      } else if (e?.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your camera connection.';
      } else if (e?.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.';
      } else if (e?.message) {
        errorMessage = `Camera error: ${e.message}`;
      }
      
      alert(errorMessage);
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
      setDraft({
        blob: file,
        type: "image",
        name: file.name || "pasted.jpg",
        previewUrl: url,
      });
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
    "😀 Smileys": [
      "😀",
      "😁",
      "😂",
      "🤣",
      "😊",
      "😍",
      "😘",
      "😎",
      "🥳",
      "😇",
      "🙂",
      "🙃",
      "😌",
    ],
    "👍 Gestures": ["👍", "👎", "👏", "🙏", "🤝", "👌", "✌️", "🤞", "👋", "💪"],
    "❤️ Hearts": [
      "❤️",
      "💙",
      "💚",
      "💛",
      "🧡",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💕",
      "💖",
    ],
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
        const url = isHttp(m.meta.image_path)
          ? m.meta.image_path
          : await toUrlFromPath(m.meta.image_path);
        if (!cancelled) setAttUrl(url);
        return;
      }
      if (m.meta?.audio_path) {
        const url = isHttp(m.meta.audio_path)
          ? m.meta.audio_path
          : await toUrlFromPath(m.meta.audio_path);
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
    return () => {
      cancelled = true;
    };
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
    m.meta?.image_path
      ? "image"
      : m.meta?.audio_path
      ? "audio"
      : m.attachment_type ?? null;

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
          <img
            src={attUrl}
            alt="image"
            className="mb-2 max-h-64 w-full rounded-xl object-cover"
            onError={() => setAttUrl(null)}
          />
        )}
        {mediaKind === "audio" && attUrl && (
          <audio
            className="mb-2 w-full"
            controls
            src={attUrl}
            onError={() => setAttUrl(null)}
          />
        )}
        {mediaKind === "file" && attUrl && (
          <a
            className="mb-2 block underline"
            href={attUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download file
          </a>
        )}

        {showText && (
          <div className="whitespace-pre-wrap break-words">
            {m.content.split(/(\[.*?\]\(.*?\))/g).map((part, idx) => {
              const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
              if (linkMatch) {
                return (
                  <a
                    key={idx}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(linkMatch[2], '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {linkMatch[1]}
                  </a>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
        )}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            own ? "text-cyan-100/90" : "text-gray-500"
          }`}
        >
          {new Date(m.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {own && m.read && (
            <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 opacity-90" />
          )}
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
  const { minimized, onToggleMin, status, mode, name, avatar, onOpen, onHangup } =
    props;
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
          <div className="text-xs text-gray-500 capitalize">
            {mode} • {status}
          </div>
        </div>
        <button
          type="button"
          className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
          title={minimized ? "Expand" : "Minimize"}
          onClick={onToggleMin}
        >
          {minimized ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {!minimized && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={onOpen}
          >
            <Monitor className="h-4 w-4" /> Open call
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-2 py-1.5 text-sm hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              onClick={() => {}}
              title="Mute (use controls in the dialog)"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
              onClick={onHangup}
              title="Hang up"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
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
          Chat failed to render. Please reload this page. If it persists, check
          Storage permissions and message attachments.
        </div>
      );
    }
    return this.props.children;
  }
}
