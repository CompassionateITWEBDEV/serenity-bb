"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type GameStats = {
  games_played: number;
  total_time_sec: number;
  high_score: number;
  streak_days: number;
  balance: number;
};
export type UseGameStats = { stats: GameStats | null; loading: boolean; error: string | null; };

const EMPTY: GameStats = { games_played: 0, total_time_sec: 0, high_score: 0, streak_days: 0, balance: 0 };

export function useGameStats(patientId?: string): UseGameStats {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const apply = useCallback((p: Partial<GameStats>) => setStats((prev) => ({ ...(prev ?? EMPTY), ...p })), []);

  const fetchStats = useCallback(async (pid: string) => {
    setLoading(true); setError(null);
    try {
      const [{ data: s, error: e1 }, { data: b, error: e2 }] = await Promise.all([
        supabase.from("patient_game_stats_v").select("*").eq("patient_id", pid).single(),
        supabase.from("reward_balances").select("balance").eq("patient_id", pid).maybeSingle(),
      ]);
      if (e1 || e2) throw new Error(e1?.message ?? e2?.message ?? "Fetch failed");
      if (!mounted.current) return;
      apply({
        games_played: s?.games_played ?? 0,
        total_time_sec: s?.total_time_sec ?? 0,
        high_score: s?.high_score ?? 0,
        streak_days: s?.streak_days ?? 0,
        balance: b?.balance ?? 0,
      });
    } catch (err: any) {
      if (mounted.current) setError(err?.message ?? String(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (!patientId) { setStats(null); setLoading(false); setError(null); return; }

    fetchStats(patientId);

    const ch = supabase
      .channel(`game_sessions_${patientId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `patient_id=eq.${patientId}` },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchStats(patientId), 250);
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    };
  }, [patientId, fetchStats]);

  return useMemo(() => ({ stats, loading, error }), [stats, loading, error]);
}
