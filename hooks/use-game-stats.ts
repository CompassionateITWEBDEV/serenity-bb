"use client";

import { useMemo } from "react";

export type GameLike = { completed?: boolean; rating?: number | null };
export type GameStatsShape = { total: number; completed: number; backlog: number; avgRating: number | null };

export function useGameStats<T extends GameLike>(games: T[]): GameStatsShape {
  return useMemo(() => {
    const total = games.length;
    let completed = 0, ratingSum = 0, ratingCount = 0;

    for (const g of games) {
      if (g?.completed) completed += 1;
      if (typeof g?.rating === "number") { ratingSum += g.rating; ratingCount += 1; }
    }

    return {
      total,
      completed,
      backlog: total - completed,
      avgRating: ratingCount ? ratingSum / ratingCount : null,
    };
  }, [games]);
}
