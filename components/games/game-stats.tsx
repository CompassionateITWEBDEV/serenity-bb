"use client";

import React from "react";
// ✅ Pick ONE import below that matches your project structure:

// If your tree is: project-root/
//   ├─ hooks/use-game-stats.ts
//   └─ components/games/game-stats.tsx
// import { useGameStats } from "../../hooks/use-game-stats";

// If your tree is: project-root/src/
//   ├─ hooks/use-game-stats.ts
//   └─ components/games/game-stats.tsx
// import { useGameStats } from "../../../hooks/use-game-stats";

// If you prefer alias "@/hooks/*" (enable with jsconfig.json below)
import { useGameStats } from "@/hooks/use-game-stats";

type Game = {
  title: string;
  completed?: boolean;
  rating?: number | null;
};

type Props = {
  games: Game[];
};

export default function GameStats({ games }: Props) {
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
