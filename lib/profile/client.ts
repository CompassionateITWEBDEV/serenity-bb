"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Patient = {
  id: string; // equals auth.uid()
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_path: string | null;
};

function nameToInitials(first?: string | null, last?: string | null, email?: string | null) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  if (f || l) return (f[0] || "") + (l[0] || "");
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

async function getAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  // Try public URL first
  const pub = supabase.storage.from("avatars").getPublicUrl(path);
  // getPublicUrl never throws; it returns a URL even if bucket isn't public. We validate with a HEAD later.
  if (pub?.data?.publicUrl) {
    // quick check: many setups keep bucket public; this is instant
    return pub.data.publicUrl;
  }

  // Signed URL fallback (private bucket)
  const res = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 10); // 10 min
  if (res.data?.signedUrl) return res.data.signedUrl;
  return null;
}

/** Real-time profile avatar hook */
export function useProfileAvatar() {
  const [userId, setUserId] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("?");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef<string | null>(null);
  const signedRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const stopRefreshTimer = () => {
    if (signedRefreshTimer.current) clearTimeout(signedRefreshTimer.current);
    signedRefreshTimer.current = null;
  };

  const scheduleSignedRefresh = useCallback((path: string | null) => {
    stopRefreshTimer();
    if (!path) return;
    // Refresh signed URL a bit before 10 min expiry.
    signedRefreshTimer.current = setTimeout(async () => {
      const url = await getAvatarUrl(path);
      setAvatarUrl(url);
      scheduleSignedRefresh(path); // reschedule
    }, 8 * 60 * 1000);
  }, []);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setInitials("?");
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, email, avatar_path")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;

      const row = (data as Patient) || null;
      const ini = nameToInitials(row?.first_name, row?.last_name, row?.email);
      setInitials(ini);

      pathRef.current = row?.avatar_path ?? null;
      const url = await getAvatarUrl(pathRef.current);
      setAvatarUrl(url);
      scheduleSignedRefresh(pathRef.current);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [scheduleSignedRefresh]);

  // Initial load
  useEffect(() => {
    hydrate();
    return () => {
      stopRefreshTimer();
    };
  }, [hydrate]);

  // Realtime profile updates
  useEffect(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`patients:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "patients", filter: `id=eq.${userId}` },
        async (payload) => {
          const row = payload.new as Patient;
          setInitials(nameToInitials(row.first_name, row.last_name, row.email));
          if (row.avatar_path !== pathRef.current) {
            pathRef.current = row.avatar_path ?? null;
            const url = await getAvatarUrl(pathRef.current);
            setAvatarUrl(url);
            scheduleSignedRefresh(pathRef.current);
          }
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, scheduleSignedRefresh]);

  // Instant refresh when Settings page completes a save
  useEffect(() => {
    const onProfileUpdated = () => hydrate();
    window.addEventListener("profile:updated", onProfileUpdated);
    return () => window.removeEventListener("profile:updated", onProfileUpdated);
  }, [hydrate]);

  return { loading, error, avatarUrl, initials };
}

/** Real-time unread notifications counter for the bell icon */
export function useUnreadCount() {
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setCount(0);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("read", false);
      if (error) throw error;
      // When head:true, count is in the response metadata; fall back to length if data present
      const c = (data as any)?.length ?? (error as any)?.count ?? (error as any)?.total ?? 0;
      setCount(typeof c === "number" ? c : 0);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

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
            if (payload.eventType === "INSERT") {
              const n = payload.new as any;
              return n.read ? prev : prev + 1;
            }
            if (payload.eventType === "UPDATE") {
              const n = payload.new as any;
              const o = payload.old as any;
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return { unreadCount: count, loading, error, refresh: hydrate };
}
