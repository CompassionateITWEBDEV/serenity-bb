"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Smile } from "lucide-react";
import type { ProviderRole } from "@/lib/chat";
import { markRead as markReadHelper } from "@/lib/chat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Provider = ProviderRole;
type MessageRow = {
  id: string; conversation_id: string; patient_id: string | null;
  sender_id: string; sender_name: string; sender_role: "patient" | Provider;
  content: string; created_at: string; read: boolean; urgent: boolean;
};
type UiSettings = {
  theme: "light" | "dark" | "system"; density: "comfortable" | "compact";
  bubbleRadius: "rounded-lg" | "rounded-xl" | "rounded-2xl";
  enterToSend: boolean; sound: boolean;
};

export default function ChatBox(props: {
  mode: "staff" | "patient"; patientId: string;
  providerId?: string; providerName?: string; providerRole?: ProviderRole;
  settings?: UiSettings;
}) {
  const { mode, patientId, settings } = props;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; name: string; role: "patient" | Provider } | null>(null);

  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didInitRef = useRef(false); // StrictMode guard

  const bubbleBase =
    (settings?.bubbleRadius ?? "rounded-xl") +
    " px-4 py-2 " +
    ((settings?.density ?? "comfortable") === "compact" ? "text-sm" : "text-[15px]");

  const ding = useCallback(() => {
    if (!settings?.sound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.001;
      o.connect(g); g.connect(ctx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12); o.stop(ctx.currentTime + 0.12);
    } catch {}
  }, [settings?.sound]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // 1) Resolve/create conversation + "me" (guarded)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id; if (!uid) return;

      if (mode === "staff") {
        const pid = props.providerId!;
        setMe({ id: pid, name: props.providerName || "Me", role: props.providerRole! });

        const { data: conv } = await supabase
          .from("conversations").select("id")
          .eq("patient_id", patientId).eq("provider_id", pid).maybeSingle();

        if (conv) setConversationId(conv.id);
        else {
          const { data: created } = await supabase
            .from("conversations")
            .upsert(
              { patient_id: patientId, provider_id: pid, provider_name: props.providerName ?? null, provider_role: props.providerRole ?? null },
              { onConflict: "patient_id,provider_id" }
            )
            .select("id").single();
          setConversationId(created!.id);
        }
      } else {
        setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
        const { data: conv } = await supabase
          .from("conversations").select("id")
          .eq("patient_id", uid).eq("provider_id", props.providerId!).maybeSingle();
        if (conv) setConversationId(conv.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patientId, props.providerId]);

  // 2) Initial fetch with layout-safe scroll
  useLayoutEffect(() => {
    if (!conversationId || !me) return;
    (async () => {
      const { data } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMsgs((data as MessageRow[]) ?? []);
      // layout effect → no flicker on first paint
      scrollToBottom(false);
      await markReadHelper(conversationId, me.role);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, me]);

  // 3) Realtime (single channel) + presence
  useEffect(() => {
    if (!conversationId || !me) return;

    // cleanup previous
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

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
          // avoid duplicates if refetch raced
          setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
          scrollToBottom(true);
          if (row.sender_id !== me.id) { ding(); await markReadHelper(conversationId, me.role); }
        }
      )
      .on(
        "postgres_changes",
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

  // broadcast typing (throttled)
  useEffect(() => {
    if (!channelRef.current || !me) return;
    const ch = channelRef.current;
    const t = setInterval(() => { ch.track({ user_id: me.id, status: text ? "typing" : "idle" }); }, 1500);
    ch.track({ user_id: me.id, status: text ? "typing" : "idle" });
    return () => clearInterval(t);
  }, [text, me]);

  const canSend = useMemo(() => !!text.trim() && !!me && !!conversationId, [text, me, conversationId]);

  const send = useCallback(async () => {
    if (!canSend || !me || !conversationId) return;
    const content = text.trim(); setText("");

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`, conversation_id: conversationId,
      patient_id: mode === "patient" ? me.id : patientId, sender_id: me.id, sender_name: me.name, sender_role: me.role,
      content, created_at: new Date().toISOString(), read: false, urgent: false,
    };
    setMsgs((m) => [...m, optimistic]); scrollToBottom(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId, patient_id: optimistic.patient_id,
      sender_id: me.id, sender_name: me.name, sender_role: me.role,
      content, read: false, urgent: false,
    });
    if (error) setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
  }, [canSend, me, conversationId, mode, patientId, text, scrollToBottom]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterToSend = settings?.enterToSend ?? true;
    if (e.key === "Enter" && !e.shiftKey && enterToSend) { e.preventDefault(); void send(); }
  };

  return (
    <Card className="h-[540px] w-full overflow-hidden"> {/* prevents inner scrollbars from pushing layout */}
      <CardContent className="flex h-full flex-col p-0">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 will-change-transform">
          <div className="space-y-3">
            {msgs.map((m) => {
              const own = m.sender_id === me?.id;
              const bubble = own
                ? `bg-cyan-500 text-white ${bubbleBase}`
                : `bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${bubbleBase}`;
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-full sm:max-w-lg ${bubble}`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className={`mt-1 text-[11px] ${own ? "text-cyan-100" : "text-gray-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && <div className="text-xs text-gray-500 px-1">…typing</div>}
            {msgs.length === 0 && <div className="text-center text-sm text-gray-500">No messages yet.</div>}
          </div>
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Dialog>
              <DialogTrigger asChild><Button type="button" variant="secondary" className="shrink-0"><Smile className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Pick an emoji</DialogTitle></DialogHeader>
                <EmojiGrid onPick={(e) => setText((v) => v + e)} />
              </DialogContent>
            </Dialog>
            <Textarea
              ref={textareaRef}
              placeholder="Type your message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              className={`min-h-[44px] max-h-[140px] flex-1 ${settings?.density === "compact" ? "text-sm" : ""}`}
            />
            <Button disabled={!canSend} onClick={send}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
              <button key={e} onClick={() => onPick(e)} className="rounded-md border p-2 text-xl hover:bg-gray-50 dark:hover:bg-gray-900" aria-label={`Insert ${e}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
