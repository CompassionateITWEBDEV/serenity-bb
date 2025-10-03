"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureConversation, getMe, listMessages, sendMessage, type Message } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props =
  | { mode: "patient"; patientId: string; providerId: string; providerName: string; providerRole: "doctor" | "nurse" | "counselor" }
  | { mode: "staff"; patientId: string; providerId: string; providerName: string; providerRole: "doctor" | "nurse" | "counselor" };

export default function ChatBox(props: Props) {
  const [ready, setReady] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const senderRole = props.mode === "patient" ? "patient" : props.providerRole;
  const counterpartName = props.mode === "patient" ? props.providerName : "Patient";

  useEffect(() => {
    (async () => {
      const me = await getMe();
      if (!me) return;

      const convo = await ensureConversation(props.patientId, {
        id: props.providerId,
        name: props.providerName,
        role: props.providerRole,
      });

      setConversationId(convo.id);
      setMessages(await listMessages(convo.id));
      setReady(true);

      // Realtime subscription (messages table)
      const channel = supabase
        .channel(`messages:${convo.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convo.id}` },
          (payload: any) => {
            const row = payload.new as Message;
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [props.patientId, props.providerId, props.providerRole, props.providerName]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function onSend() {
    const me = await getMe();
    if (!me || !text.trim() || !conversationId) return;
    await sendMessage({
      conversationId,
      patientId: props.patientId,
      senderId: me.id,
      senderName: me.user_metadata?.full_name || me.email || "Me",
      senderRole,
      content: text,
    });
    setText("");
  }

  const title = useMemo(
    () => (props.mode === "patient" ? `Your care team: ${props.providerName}` : `Patient chat`),
    [props.mode, props.providerName],
  );

  return (
    <Card className="h-[540px] w-full">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-[460px] flex-col">
        <div ref={listRef} className="flex-1 overflow-y-auto rounded border p-3">
          {!ready && <div className="text-sm text-gray-500">Connecting…</div>}
          {ready && messages.length === 0 && <div className="text-sm text-gray-500">Say hello to {counterpartName}.</div>}
          {messages.map((m) => (
            <div key={m.id} className={`mb-2 flex ${m.sender_role === "patient" ? "justify-start" : "justify-end"}`}>
              <div className="max-w-[75%] rounded-lg border px-3 py-2 text-sm">
                <div className="mb-1 text-[11px] opacity-60">{m.sender_name}</div>
                <div>{m.content}</div>
                <div className="mt-1 text-[10px] opacity-50">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />
          <Button onClick={onSend} disabled={!text.trim() || !ready}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
