"use client";

import { useMemo } from "react";

export type GameLike = {
  completed?: boolean;
  rating?: number | null;
};

export type GameStats = {
  total: number;
  completed: number;
  backlog: number;
  avgRating: number | null;
};

export function useGameStats<T extends GameLike>(games: T[]): GameStats {
  // Why: memoize derived stats to avoid unnecessary recompute.
  return useMemo(() => {
    const total = games.length;
    let completed = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const g of games) {
      if (g?.completed) completed += 1;
      if (typeof g?.rating === "number") {
        ratingSum += g.rating;
        ratingCount += 1;
      }
    }

    const backlog = total - completed;
    const avgRating = ratingCount ? ratingSum / ratingCount : null;

    return { total, completed, backlog, avgRating };
  }, [games]);
}
