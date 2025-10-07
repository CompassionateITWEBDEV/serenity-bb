"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import type { ProviderRole } from "@/lib/chat";
import { markRead as markReadHelper } from "@/lib/chat";

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
};

export default function ChatBox(props: {
  mode: "staff" | "patient";
  patientId: string;
  providerId?: string;
  providerName?: string;
  providerRole?: ProviderRole;
}) {
  const { mode, patientId } = props;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; name: string; role: "patient" | ProviderRole } | null>(null);

  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // keep a single realtime channel ref
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ===== helpers
  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const refetchThread = useCallback(async (cid: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    if (error) return;
    setMsgs((data as MessageRow[]) ?? []);
    queueMicrotask(() => scrollToBottom(false));
  }, [scrollToBottom]);

  // ===== resolve/create conversation + "me"
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) return;

      if (mode === "staff") {
        const pid = props.providerId!;
        setMe({ id: pid, name: props.providerName || "Me", role: props.providerRole! });

        const { data: conv, error } = await supabase
          .from("conversations")
          .select("id")
          .eq("patient_id", patientId)
          .eq("provider_id", pid)
          .maybeSingle();

        if (!error && conv) {
          setConversationId(conv.id);
        } else {
          const { data: created, error: insErr } = await supabase
            .from("conversations")
            .upsert(
              {
                patient_id: patientId,
                provider_id: pid,
                provider_name: props.providerName ?? null,
                provider_role: props.providerRole ?? null,
              },
              { onConflict: "patient_id,provider_id" }
            )
            .select("id")
            .single();
          if (insErr) throw insErr;
          setConversationId(created!.id);
        }
      } else {
        setMe({ id: uid, name: au.user?.email || "Me", role: "patient" });
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("patient_id", uid)
          .eq("provider_id", props.providerId!)
          .maybeSingle();
        if (conv) setConversationId(conv.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patientId, props.providerId]);

  // ===== initial load + realtime subscription
  useEffect(() => {
    if (!conversationId || !me) return;

    let mounted = true;

    (async () => {
      await refetchThread(conversationId);
      await markReadHelper(conversationId, me.role);
    })();

    // tear down previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`thread_${conversationId}`)
      // INSERTs: append; UPDATE/DELETE: refetch to keep order consistent
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "INSERT", filter: `conversation_id=eq.${conversationId}` },
        async (p) => {
          if (!mounted) return;
          const row = p.new as MessageRow;
          setMsgs((prev) => {
            // guard: avoid duplicates if refetch raced
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          scrollToBottom(true);
          if (row.sender_id !== me.id) await markReadHelper(conversationId, me.role);
        }
      )
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "UPDATE", filter: `conversation_id=eq.${conversationId}` },
        () => refetchThread(conversationId)
      )
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "DELETE", filter: `conversation_id=eq.${conversationId}` },
        () => refetchThread(conversationId)
      )
      .subscribe((status) => {
        // why: helps diagnose reconnects; Supabase auto-retries.
        // console.debug("[realtime] thread status:", conversationId, status);
        if (status === "SUBSCRIBED") {
          // do nothing; already fetched above
        }
      });

    channelRef.current = ch;

    // resilience: refresh on visibility/online focus
    const onFocusOrOnline = async () => {
      if (!conversationId || !me) return;
      await refetchThread(conversationId);
      await markReadHelper(conversationId, me.role);
    };
    window.addEventListener("focus", onFocusOrOnline);
    window.addEventListener("online", onFocusOrOnline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void onFocusOrOnline();
    });

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocusOrOnline);
      window.removeEventListener("online", onFocusOrOnline);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, me, refetchThread, scrollToBottom]);

  // ===== send
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

    if (error) {
      // rollback optimistic
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      alert(`Send failed: ${error.message}`);
    }
  }, [canSend, me, conversationId, mode, patientId, text, scrollToBottom]);

  return (
    <Card className="h-[540px] w-full">
      <CardContent className="flex h-full flex-col p-0">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {msgs.map((m) => {
              const own = m.sender_id === me?.id;
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-full sm:max-w-lg rounded-xl px-4 py-2 ${own ? "bg-cyan-500 text-white" : "bg-gray-100"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className={`mt-1 text-[11px] ${own ? "text-cyan-100" : "text-gray-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            {msgs.length === 0 && <div className="text-center text-sm text-gray-500">No messages yet.</div>}
          </div>
        </div>
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Type your message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              className="min-h-[44px] max-h-[140px] flex-1"
            />
            <Button disabled={!canSend} onClick={send}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
