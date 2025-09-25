"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/** Live unread notifications badge for the bell icon. */
export function useUnreadCount(userId?: string | null) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const hydrate = useCallback(async () => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error, count: exact } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
      setCount(typeof exact === "number" ? exact : Array.isArray(data) ? data.length : 0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!userId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setCount((prev) => {
            if (payload.eventType === "INSERT") return (payload.new as any).read ? prev : prev + 1;
            if (payload.eventType === "UPDATE") {
              const n = payload.new as any, o = payload.old as any;
              if (o.read === false && n.read === true) return Math.max(0, prev - 1);
            }
            if (payload.eventType === "DELETE") {
              const o = payload.old as any;
              if (o.read === false) return Math.max(0, prev - 1);
            }
            return prev;
          });
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  return { unreadCount: count, loading, refresh: hydrate };
}
