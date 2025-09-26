"use client";

import React, { useMemo } from "react";
import { useGameStats } from "@/hooks/use-game-stats";

type MinimalGame = { completed?: boolean; rating?: number | null };
type Props = { games?: MinimalGame[] };

// Fallback calculator if Supabase data isn't ready
function computeLocal(games: MinimalGame[] = []) {
  const total = games.length;
  const completed = games.filter((g) => g.completed).length;
  const backlog = total - completed;
  const ratings = games.map((g) => g.rating).filter((n): n is number => n != null);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return { total, completed, backlog, avgRating };
}

function GameStats({ games = [] }: Props) {
  // Hook has NO params; returns { summary }.
  const { loading, summary } = useGameStats();

  const safe = useMemo(() => computeLocal(games), [games]);

  const total = loading ? safe.total : summary.gamesPlayed ?? safe.total;
  const completed = loading ? safe.completed : undefined; // Unknown from server; keep local if needed
  const backlog = loading ? safe.backlog : undefined;
  const avgRating = loading ? safe.avgRating : null; // Server summary doesn't include avgRating

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Total" value={total} />
      <Stat label="Completed" value={completed ?? "—"} />
      <Stat label="Backlog" value={backlog ?? "—"} />
      <Stat label="Avg Rating" value={avgRating == null ? "—" : avgRating.toFixed(2)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

export default GameStats;
export { GameStats };
