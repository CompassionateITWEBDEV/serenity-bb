// FILE: components/games/use-game-stats.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import getClient from "@/lib/supabase-browser";

export type GameStats = {
  games_played: number;
  total_time_sec: number;
  high_score: number;
  streak_days: number;
  balance: number;
};

export type UseGameStats = {
  stats: GameStats | null;
  loading: boolean;
  error: string | null;
};

const DEFAULT_STATS: GameStats = {
  games_played: 0,
  total_time_sec: 0,
  high_score: 0,
  streak_days: 0,
  balance: 0,
};

export function useGameStats(patientId?: string): UseGameStats {
  const supabase = getClient();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyStats = useCallback((next: Partial<GameStats>) => {
    setStats((prev) => ({
      ...(prev ?? DEFAULT_STATS),
      ...next,
    }));
  }, []);

  const fetchStats = useCallback(
    async (pid: string) => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: s, error: e1 }, { data: b, error: e2 }] = await Promise.all([
          supabase
            .from("patient_game_stats_v")
            .select("*")
            .eq("patient_id", pid)
            .single(),
          supabase
            .from("reward_balances")
            .select("balance")
            .eq("patient_id", pid)
            .maybeSingle(),
        ]);

        if (e1 || e2) throw new Error(e1?.message ?? e2?.message ?? "Unknown error");

        if (!mounted.current) return;

        applyStats({
          games_played: s?.games_played ?? 0,
          total_time_sec: s?.total_time_sec ?? 0,
          high_score: s?.high_score ?? 0,
          streak_days: s?.streak_days ?? 0,
          balance: b?.balance ?? 0,
        });
      } catch (err: any) {
        if (!mounted.current) return;
        setError(err?.message ?? String(err));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [applyStats, supabase]
  );

  // Initial load + subscription
  useEffect(() => {
    // teardown previous sub + timers
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!patientId) {
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    fetchStats(patientId);

    const channel = supabase
      .channel(`game_sessions_${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          // why: dedupe bursts from INSERT+UPDATE chains
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            if (patientId) fetchStats(patientId);
          }, 250);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [patientId, fetchStats, supabase]);

  return useMemo<UseGameStats>(
    () => ({ stats, loading, error }),
    [stats, loading, error]
  );
}
