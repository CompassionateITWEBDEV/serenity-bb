"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

type Handler = (payload: { type: "INSERT"|"UPDATE"|"DELETE"; row: any }) => void;

/** Subscribes to postgres_changes for a conversation; reconnects if socket drops. */
export function useThreadRealtime(conversationId: string | null, onEvent: Handler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`thread_${conversationId}`, { config: { presence: { key: conversationId } } })
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "*", filter: `conversation_id=eq.${conversationId}` },
        (p: any) => {
          const type = p.eventType as "INSERT"|"UPDATE"|"DELETE";
          handlerRef.current({ type, row: type === "DELETE" ? p.old : p.new });
        }
      )
      .subscribe((status) => {
        // why: visible diagnostics & implicit reconnects
        // console.debug("[realtime] thread status:", conversationId, status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);
}
