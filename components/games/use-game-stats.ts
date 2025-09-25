"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type GameStatSummary = {
  gamesPlayed: number;
  totalMinutes: number;
  highScore: number;
  streakDays: number;
};

type SessionRow = {
  id: string;
  patient_id: string;
  game_id: string;
  score: number | null;
  duration_sec: number | null;
  created_at: string;
};

function calcStreak(rows: SessionRow[]): number {
  // unique activity dates (YYYY-MM-DD) in local tz
  const days = new Set(
    rows.map((r) =>
      new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: undefined })
    )
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    if (days.has(key)) streak++;
    else break;
  }
  return streak;
}

export function useGameStats() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [summary, setSummary] = useState<GameStatSummary>({
    gamesPlayed: 0,
    totalMinutes: 0,
    highScore: 0,
    streakDays: 0,
  });

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    // pull recent 90 days detailed rows for streak, plus aggregates for all-time
    const [agg, recent] = await Promise.all([
      supabase
        .from("game_sessions")
        .select("count:id, sum:duration_sec, max:score", { count: "exact", head: false })
        .eq("patient_id", uid),
      supabase
        .from("game_sessions")
        .select("id, patient_id, game_id, score, duration_sec, created_at")
        .eq("patient_id", uid)
        .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString())
        .order("created_at", { ascending: false }),
    ]);

    const count = (agg.count ?? 0) as number;
    const totalSec =
      ((agg.data as any)?.[0]?.sum as number | null) ??
      // some PostgREST versions put aggregates in first row; fallback compute:
      recent.data?.reduce((a, r) => a + (r.duration_sec ?? 0), 0) ??
      0;
    const maxScore =
      ((agg.data as any)?.[0]?.max as number | null) ??
      recent.data?.reduce((m, r) => Math.max(m, r.score ?? 0), 0) ??
      0;

    const streak = calcStreak(recent.data ?? []);
    setRows(recent.data ?? []);
    setSummary({
      gamesPlayed: count,
      totalMinutes: Math.round(totalSec / 60),
      highScore: maxScore || 0,
      streakDays: streak || 0,
    });
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user?.id ?? null;
      setUid(u);
      if (u) await refresh();
    })();
  }, [refresh]);

  // realtime: insert/update/delete
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`game_sessions:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `patient_id=eq.${uid}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, refresh]);

  const recordSession = useCallback(
    async (gameId: string, score: number, durationSec: number) => {
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("game_sessions").insert({
        patient_id: uid,
        game_id: gameId,
        score,
        duration_sec: durationSec,
      });
      if (error) throw error;
      // refresh will run via realtime, but do a quick optimistic update for UX
      setSummary((s) => ({
        gamesPlayed: s.gamesPlayed + 1,
        totalMinutes: s.totalMinutes + Math.round(durationSec / 60),
        highScore: Math.max(s.highScore, score || 0),
        streakDays: s.streakDays, // next server refresh recalculates accurately
      }));
    },
    [uid]
  );

  return { loading, summary, rows, recordSession, refresh };
}
