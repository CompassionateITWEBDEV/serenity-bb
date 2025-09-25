"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  read: boolean;
  created_at: string;
};

type UseNotificationsOptions = {
  limit?: number; // default 50
};

/**
 * Why: Centralizes realtime + queries; avoids multiple socket channels across pages.
 */
export function useNotifications(opts: UseNotificationsOptions = {}) {
  const limit = opts.limit ?? 50;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Resolve user once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        setUserId(data.user?.id ?? null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Failed to get user");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const fetchLatest = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      setItems((data as NotificationRow[]) ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  // Realtime subscription for inserts/updates
  useEffect(() => {
    if (!userId) return;

    // Clean previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Why: Keep local cache in sync with minimal work.
          setItems((prev) => {
            const next = [...prev];
            if (payload.eventType === "INSERT") {
              next.unshift(payload.new as NotificationRow);
              return next.slice(0, limit);
            }
            if (payload.eventType === "UPDATE") {
              const idx = next.findIndex((n) => n.id === (payload.new as any).id);
              if (idx >= 0) next[idx] = payload.new as NotificationRow;
              return next;
            }
            if (payload.eventType === "DELETE") {
              return next.filter((n) => n.id !== (payload.old as any).id);
            }
            return next;
          });
        }
      )
      .subscribe((status) => {
        // On first connect, hydrate
        if (status === "SUBSCRIBED") fetchLatest();
      });

    channelRef.current = ch;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, limit, fetchLatest]);

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [items]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", id)
          .eq("user_id", userId!);
        if (error) throw error;
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      } catch (e: any) {
        setError(e?.message ?? "Failed to mark as read");
      }
    },
    [userId]
  );

  const refresh = useCallback(() => fetchLatest(), [fetchLatest]);

  return { notifications: items, unreadCount, loading, error, markAsRead, refresh };
}
