"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PatientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_path: string | null;
};

async function buildAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const pub = supabase.storage.from("avatars").getPublicUrl(path);
  if (pub?.data?.publicUrl) return pub.data.publicUrl;
  const signed = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 10);
  return signed.data?.signedUrl ?? null;
}

function toInitials(first?: string | null, last?: string | null, email?: string | null) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase() || "U";
  return email?.[0]?.toUpperCase() ?? "U";
}

/** Live avatar + initials for header; refreshes on DB changes and custom event. */
export function useProfileAvatar(opts: {
  userId: string | null | undefined;
  fallbackUrl?: string | null;
  initialPath?: string | null;
}) {
  const { userId, fallbackUrl = null, initialPath = null } = opts;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(fallbackUrl ?? null);
  const [initials, setInitials] = useState<string>("U");
  const [loading, setLoading] = useState<boolean>(true);
  const pathRef = useRef<string | null>(initialPath);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const stopTimer = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = null;
  };

  const scheduleRefresh = useCallback((path: string | null) => {
    stopTimer();
    if (!path) return;
    refreshTimer.current = setTimeout(async () => {
      setAvatarUrl(await buildAvatarUrl(path));
      scheduleRefresh(path); // keep alive for signed URLs
    }, 8 * 60 * 1000);
  }, []);

  const hydrate = useCallback(async () => {
    if (!userId) {
      setAvatarUrl(fallbackUrl ?? null);
      setInitials("U");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, email, avatar_path")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;

      const row = (data as PatientRow) ?? null;
      setInitials(toInitials(row?.first_name, row?.last_name, row?.email));

      pathRef.current = row?.avatar_path ?? null;
      setAvatarUrl(await buildAvatarUrl(pathRef.current) ?? fallbackUrl ?? null);
      scheduleRefresh(pathRef.current);
    } finally {
      setLoading(false);
    }
  }, [userId, fallbackUrl, scheduleRefresh]);

  useEffect(() => {
    hydrate();
    return () => stopTimer();
  }, [hydrate]);

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
          const row = payload.new as PatientRow;
          setInitials(toInitials(row.first_name, row.last_name, row.email));
          if (row.avatar_path !== pathRef.current) {
            pathRef.current = row.avatar_path ?? null;
            setAvatarUrl(await buildAvatarUrl(pathRef.current));
            scheduleRefresh(pathRef.current);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId, scheduleRefresh]);

  useEffect(() => {
    const onUpdated = () => hydrate(); // why: instant header refresh after Settings save
    window.addEventListener("profile:updated", onUpdated);
    return () => window.removeEventListener("profile:updated", onUpdated);
  }, [hydrate]);

  return { avatarUrl, initials, loading };
}
