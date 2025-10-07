"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "lucide-react";
import type { ProviderRole } from "@/lib/chat";
import { markRead as markReadHelper } from "@/lib/chat";

type Provider = ProviderRole;
type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string | null;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | Provider;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

type UiSettings = {
  theme?: "light" | "dark" | "system";
  density?: "comfortable" | "compact";
  bubbleRadius?: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend?: boolean;
  sound?: boolean;
};

export default function ChatBox(props: {
  /** who is using this component */
  mode: "staff" | "patient";
  /** patient id for the thread */
  patientId: string;
  /** provider info when patient chats a specific provider (or staff self-id when mode=staff) */
  providerId?: string;
  providerName?: string;
  providerRole?: ProviderRole;
  providerAvatarUrl?: string | null;
  /** optional display for the other side when mode=staff */
  patientName?: string | null;
  patientAvatarUrl?: string | null;
  settings?: UiSettings;
  /** optional header back action (mobile) */
  onBack?: () => void;
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
  } = props;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; name: string; role: "patient" | Provider } | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const didInitRef = useRef(false);

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

  // initialize: resolve/create conversation & current user
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) return;

      if (mode === "staff") {
        const pid = providerId!;
        setMe({ id: pid, name: providerName || "Me", role: providerRole! });

        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("patient_id", patientId)
          .eq("provider_id", pid)
          .maybeSingle();

        if (conv) setConversationId(conv.id);
        else {
          const { data: created } = await supabase
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
          setConversationId(created!.id);
        }
      } else {
        setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("patient_id", uid)
          .eq("provider_id", providerId!)
          .maybeSingle();
        if (conv) setConversationId(conv.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patientId, providerId]);

  // first load
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, me]);

  // realtime + presence
  useEffect(() => {
    if (!conversationId || !me) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`thread_${conversationId}`, { config: { presence: { key: me.id } } })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const others = Object.entries(state).flatMap(([, v]: any) => v) as any[];
        setTyping(others.some((s) => s.status === "typing"));
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

  // broadcast typing
  useEffect(() => {
    if (!channelRef.current || !me) return;
    const ch = channelRef.current;
    const t = setInterval(() => {
      ch.track({ user_id: me.id, status: text ? "typing" : "idle" });
    }, 1500);
    ch.track({ user_id: me.id, status: text ? "typing" : "idle" });
    return () => clearInterval(t);
  }, [text, me]);

  const canSend = useMemo(() => !!text.trim() && !!me && !!conversationId, [text, me, conversationId]);

  const send = useCallback(async () => {
    if (!canSend || !me || !conversationId) return;
    const content = text.trim();
    setText("");

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      patient_id: mode === "patient" ? me.id : patientId,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: me.role,
      content,
      created_at: new Date().toISOString(),
      read: false,
      urgent: false,
    };
    setMsgs((m) => [...m, optimistic]);
    scrollToBottom(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      patient_id: optimistic.patient_id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: me.role,
      content,
      read: false,
      urgent: false,
    });
    if (error) setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
  }, [canSend, me, conversationId, mode, patientId, text, scrollToBottom]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterToSend = settings?.enterToSend ?? true;
    if (e.key === "Enter" && !e.shiftKey && enterToSend) {
      e.preventDefault();
      void send();
    }
  };

  // ————— UI —————

  const otherName =
    mode === "staff" ? patientName || "Patient" : providerName || "Provider";
  const otherRole =
    mode === "staff" ? "Online" : providerRole ? providerRole : undefined;
  const otherAvatar =
    mode === "staff" ? patientAvatarUrl : providerAvatarUrl;

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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={otherAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-cyan-100 text-cyan-700">
                  {(otherName || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">{otherName}</div>
              <div className="text-[11px] text-gray-500">{otherRole || "Online"}</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <IconButton aria="Voice call"><Phone className="h-5 w-5" /></IconButton>
            <IconButton aria="Video call"><Video className="h-5 w-5" /></IconButton>
            <IconButton aria="More"><MoreVertical className="h-5 w-5" /></IconButton>
          </div>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950">
          <div className="mx-auto max-w-xl space-y-3">
            {msgs.map((m) => {
              const own = m.sender_id === me?.id;
              const bubble =
                own
                  ? `bg-cyan-500 text-white ${bubbleBase} shadow-md`
                  : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 ${bubbleBase} ring-1 ring-gray-200/70 dark:ring-zinc-700`;
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
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {own && m.read && <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 opacity-90" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {typing && <div className="px-1 text-xs text-gray-500">…typing</div>}
            {msgs.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello 👋</div>
            )}
          </div>
        </div>

        {/* Composer / action bar */}
        <div className="border-t bg-white/80 px-3 py-2 backdrop-blur dark:bg-zinc-900/70">
          <div className="mx-auto flex max-w-xl items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <IconButton aria="Emoji picker"><Smile className="h-5 w-5" /></IconButton>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Pick an emoji</DialogTitle>
                  </DialogHeader>
                  <EmojiGrid onPick={(e) => setText((v) => v + e)} />
                </DialogContent>
              </Dialog>
              <IconButton aria="Attach image"><ImageIcon className="h-5 w-5" /></IconButton>
              <IconButton aria="Camera"><Camera className="h-5 w-5" /></IconButton>
              <IconButton aria="Voice note"><Mic className="h-5 w-5" /></IconButton>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message…"
              className={`min-h-[46px] max-h-[140px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700 ${
                settings?.density === "compact" ? "text-sm" : ""
              }`}
            />

            <Button
              disabled={!canSend}
              onClick={send}
              className="h-11 rounded-2xl px-4 shadow-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Small circular ghost button used in header/action bar */
function IconButton({ children, aria }: { children: React.ReactNode; aria: string }) {
  return (
    <button
      type="button"
      aria-label={aria}
      className="rounded-full p-2 hover:bg-gray-100 active:scale-95 dark:hover:bg-zinc-800"
    >
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
