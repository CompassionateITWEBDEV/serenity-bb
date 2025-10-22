"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type MiniNotification = {
  id: string;
  patient_id: string;
  type: "message" | "medicine" | "alert";
  title: string;
  message: string;
  read: boolean;
  created_at: string; // ISO
};

export function useNotificationsMini(pageSize = 8) {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<MiniNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = useMemo(() => items.reduce((a, n) => a + (n.read ? 0 : 1), 0), [items]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("patient_id", uid)
      .order("created_at", { ascending: false })
      .limit(pageSize);
    if (!error) setItems(data ?? []);
    setLoading(false);
  }, [uid, pageSize]);

  const markRead = useCallback(async (id: string) => {
    if (!uid) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("patient_id", uid);
    if (!error) setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, [uid]);

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("patient_id", uid)
      .eq("read", false);
    if (!error) setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [uid]);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (live) setUid(data.session?.user?.id ?? null);
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!uid) return;
    refresh();

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `patient_id=eq.${uid}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as MiniNotification, ...prev].slice(0, pageSize);
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

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [uid, pageSize, refresh]);

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
}
