"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  href: string | null;      // optional deep link
  read: boolean;
  created_at: string;       // ISO
  icon: string | null;      // optional icon name
  kind: string | null;      // optional category/tag
};

type Page = { from: number; to: number };

export function useNotificationsFeed(pageSize = 12) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef<Page>({ from: 0, to: pageSize - 1 });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [items]
  );

  const fetchPage = useCallback(
    async (reset = false) => {
      if (!userId) return;
      reset ? setLoading(true) : setLoadingMore(true);
      try {
        const page = reset ? { from: 0, to: pageSize - 1 } : pageRef.current;
        const { data, error, count } = await supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(page.from, page.to);
        if (error) throw error;
        const rows = (data as NotificationRow[]) ?? [];
        if (reset) {
          setItems(rows);
          pageRef.current = { from: 0, to: pageSize - 1 };
        } else {
          setItems((prev) => [...prev, ...rows]);
        }
        const total = typeof count === "number" ? count : rows.length;
        const consumed = (reset ? rows.length : page.to + 1);
        setHasMore(consumed < total);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load notifications");
      } finally {
        reset ? setLoading(false) : setLoadingMore(false);
      }
    },
    [userId, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || loadingMore) return;
    const next = {
      from: pageRef.current.to + 1,
      to: pageRef.current.to + pageSize,
    };
    pageRef.current = next;
    await fetchPage(false);
  }, [userId, hasMore, loadingMore, pageSize, fetchPage]);

  const refresh = useCallback(async () => fetchPage(true), [fetchPage]);

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

  // Init user + first page
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!live) return;
      setUserId(data.user?.id ?? null);
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchPage(true);
  }, [userId, fetchPage]);

  // Realtime
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
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const next = [payload.new as NotificationRow, ...prev];
              return next;
            }
            if (payload.eventType === "UPDATE") {
              const up = payload.new as NotificationRow;
              return prev.map((n) => (n.id === up.id ? up : n));
            }
            if (payload.eventType === "DELETE") {
              const del = payload.old as NotificationRow;
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
  }, [userId]);

  return { items, unreadCount, loading, loadingMore, error, hasMore, loadMore, refresh, markRead, markAllRead };
}
