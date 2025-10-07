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

  // Resolve/create conversation and "me"
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) return;

      if (mode === "staff") {
        // why: staff UI sends as provider
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
        // patient mode
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

  // Load history & subscribe realtime
  useEffect(() => {
    if (!conversationId || !me) return;
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (alive) {
        setMsgs((data as MessageRow[]) ?? []);
        queueMicrotask(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
        // mark read on open
        await markReadHelper(conversationId, me.role);
      }
    })();

    const ch = supabase
      .channel(`thread_${conversationId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}`, event: "*" },
        async (p) => {
          if (p.eventType === "INSERT") {
            setMsgs((m) => [...m, p.new as MessageRow]);
            listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" });
            // auto mark read if inbound
            const n = p.new as MessageRow;
            if (n.sender_id !== me.id) await markReadHelper(conversationId, me.role);
          } else {
            const { data } = await supabase
              .from("messages").select("*")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true });
            setMsgs((data as MessageRow[]) ?? []);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); alive = false; };
  }, [conversationId, me]);

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
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      alert(`Send failed: ${error.message}`);
    }
  }, [canSend, me, conversationId, mode, patientId, text]);

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
