"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type MiniNotification = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  href: string | null;      // optional deep link
  read: boolean;
  created_at: string;       // ISO timestamp
};

export function useNotificationsMini(pageSize = 8) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<MiniNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [items]
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(pageSize);
      if (error) throw error;
      setItems((data as MiniNotification[]) ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [userId, pageSize]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      } catch (e: any) {
        setError(e?.message ?? "Failed to mark as read");
      }
    },
    [userId]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e: any) {
      setError(e?.message ?? "Failed to mark all as read");
    }
  }, [userId]);

  // Resolve user once
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!live) return;
      setUserId(data.user?.id ?? null);
    })();
    return () => { live = false; };
  }, []);

  // Initial fetch + realtime subscribe
  useEffect(() => {
    if (!userId) return;

    refresh();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase
      .channel(`notifications:mini:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const next = [payload.new as MiniNotification, ...prev];
              return next.slice(0, pageSize);
            }
            if (payload.eventType === "UPDATE") {
              const up = payload.new as MiniNotification;
              return prev.map((n) => (n.id === up.id ? up : n));
            }
            if (payload.eventType === "DELETE") {
              const del = payload.old as MiniNotification;
              return prev.filter((n) => n.id !== del.id);
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
  }, [userId, pageSize, refresh]);

  return { items, unreadCount, loading, error, refresh, markRead, markAllRead };
}
