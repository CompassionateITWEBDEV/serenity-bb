"use client";
import { useEffect, useRef, useState } from "react";
import getClient from "@/lib/supabase-browser";

export type GameStats = {
  games_played: number;
  total_time_sec: number;
  high_score: number;
  streak_days: number;
  balance?: number;
};

export function useGameStats(patientId?: string) {
  const supabase = getClient();
  const [stats, setStats] = useState<GameStats | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!patientId) return;

    let unsub: (() => void) | undefined;

    (async () => {
      // initial fetch
      const { data } = await supabase
        .from("patient_game_stats_v")
        .select("*")
        .eq("patient_id", patientId)
        .single();

      const { data: bal } = await supabase
        .from("reward_balances")
        .select("balance")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (isMounted.current) {
        setStats({
          games_played: data?.games_played ?? 0,
          total_time_sec: data?.total_time_sec ?? 0,
          high_score: data?.high_score ?? 0,
          streak_days: data?.streak_days ?? 0,
          balance: bal?.balance ?? 0,
        });
      }

      // realtime: listen to own sessions
      const channel = supabase
        .channel(`game_sessions_${patientId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "game_sessions", filter: `patient_id=eq.${patientId}` },
          async () => {
            const { data: s } = await supabase
              .from("patient_game_stats_v")
              .select("*")
              .eq("patient_id", patientId)
              .single();
            const { data: b } = await supabase
              .from("reward_balances")
              .select("balance")
              .eq("patient_id", patientId)
              .maybeSingle();
            if (isMounted.current) {
              setStats({
                games_played: s?.games_played ?? 0,
                total_time_sec: s?.total_time_sec ?? 0,
                high_score: s?.high_score ?? 0,
                streak_days: s?.streak_days ?? 0,
                balance: b?.balance ?? 0,
              });
            }
          }
        )
        .subscribe();

      unsub = () => { supabase.removeChannel(channel); };
    })();

    return () => { unsub?.(); };
  }, [patientId, supabase]);

  return stats;
}
