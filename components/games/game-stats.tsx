"use client";

import React from "react";
import { useGameStats } from "@/hooks/use-game-stats";

// ✅ Hook is called unconditionally; props have defaults
type MinimalGame = { completed?: boolean; rating?: number | null };
export default function GameStats({ games }: { games: MinimalGame[] }) {
  const safe = Array.isArray(games) ? games : [];
  const stats = useGameStats(safe);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Total" value={stats.total} />
      <Stat label="Completed" value={stats.completed} />
      <Stat label="Backlog" value={stats.backlog} />
      <Stat label="Avg Rating" value={stats.avgRating == null ? "—" : stats.avgRating.toFixed(2)} />
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
