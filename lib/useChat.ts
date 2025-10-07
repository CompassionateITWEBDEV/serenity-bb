"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function useChat(conversationId: string | null) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );
  const [messages, setMessages] = useState<any[]>([]);
  const earliest = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const res = await fetch(`/api/chat/messages/${conversationId}?limit=50`, { cache: "no-store" });
      const { messages: initial } = await res.json();
      setMessages(initial);
      earliest.current = initial[0]?.created_at ?? null;
    })();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`msg:${conversationId}`, { config: { broadcast: { ack: true } } })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as any) : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const markRead = async () => {
    if (!conversationId) return;
    await fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
  };

  const loadMore = async () => {
    if (!conversationId || !earliest.current) return;
    const res = await fetch(
      `/api/chat/messages/${conversationId}?limit=50&before=${encodeURIComponent(
        earliest.current
      )}`,
      { cache: "no-store" }
    );
    const { messages: older } = await res.json();
    if (older.length) {
      earliest.current = older[0].created_at;
      setMessages((prev) => [...older, ...prev]);
    }
  };

  return { messages, markRead, loadMore };
}
