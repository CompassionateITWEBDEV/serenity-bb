"use client";

import React from "react";
import { useGameStats } from "@/hooks/use-game-stats";
import type { Game } from "./game-card";

type Props = { games: Game[] };

function GameStats({ games }: Props) {
  const stats = useGameStats(games);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Total" value={stats.total} />
      <Stat label="Completed" value={stats.completed} />
      <Stat label="Backlog" value={stats.backlog} />
      <Stat label="Avg Rating" value={stats.avgRating?.toFixed(2) ?? "—"} />
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
