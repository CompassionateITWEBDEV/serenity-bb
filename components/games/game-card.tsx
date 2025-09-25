"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameStats } from "@/hooks/use-game-stats";

type Game = {
  id: string;
  title: string;
  description: string;
  duration: string; // e.g. "10-15 min"
  bestScore: number;
  isNew?: boolean;
  color?: string;
  borderColor?: string;
};

export function GameCard({ game }: { game: Game }) {
  const { recordSession } = useGameStats();

  // Parse "10-15 min" -> take the upper bound minutes (15)
  function parseDurationMin(s: string): number {
    const m = /(\d+)(?:-(\d+))?\s*min/i.exec(s);
    if (!m) return 10;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    return Math.max(a, b);
  }

  async function complete() {
    const durationSec = parseDurationMin(game.duration) * 60;
    const score = Math.floor(Math.random() * 1000); // TODO: replace with real game score
    try {
      await recordSession(game.id, score, durationSec);
      alert(`Saved session for "${game.title}" (score ${score}).`);
    } catch (e: any) {
      alert(`Could not save session: ${e.message ?? e}`);
    }
  }

  return (
    <Card className={game.borderColor ? `border ${game.borderColor}` : ""}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold">{game.title}</h4>
            <p className="text-sm text-gray-600">{game.description}</p>
            <p className="mt-2 text-xs text-gray-500">
              Duration: {game.duration} · Best Score: {game.bestScore ?? 0}
            </p>
          </div>
          {game.isNew && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">New</span>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="default">Continue Playing</Button>
          <Button variant="outline" onClick={complete}>
            Complete Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
