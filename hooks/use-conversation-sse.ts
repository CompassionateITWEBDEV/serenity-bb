"use client";

import { useEffect, useRef } from "react";

export type RealtimeChange<T = any> = {
  type: "INSERT" | "UPDATE" | "DELETE";
  new?: T | null;
  old?: T | null;
};

type Handler<T> = (change: RealtimeChange<T>) => void;

export function useConversationSSE<T = any>(
  conversationId: string | null | undefined,
  onChange: Handler<T>
) {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  useEffect(() => {
    if (!conversationId) return;

    const url = `/api/realtime?conversationId=${encodeURIComponent(conversationId)}`;
    const es = new EventSource(url, { withCredentials: true });

    const onChangeEvt = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type) handlerRef.current({ type: data.type, new: data.new, old: data.old });
      } catch {
        // ignore JSON errors
      }
    };

    es.addEventListener("change", onChangeEvt as EventListener);
    es.addEventListener("message", onChangeEvt as EventListener); // some proxies rename events

    es.addEventListener("error", () => {
      // browser will auto-retry SSE; keep silent
    });

    return () => {
      es.close();
    };
  }, [conversationId]);
}
