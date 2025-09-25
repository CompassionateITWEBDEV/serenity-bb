// path: components/games/game-card.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameStats } from "@/hooks/use-game-stats";

export type Game = {
  id: string;
  title: string;
  description: string;
  /** e.g. "10-15 min" or "12 min" */
  duration: string;
  bestScore: number;
  isNew?: boolean;
  color?: string;
  borderColor?: string;
};

type Props = {
  game: Game;
  /** optional override when you have a real score from gameplay */
  score?: number;
  /** optional override when gameplay tracks exact duration */
  durationSec?: number;
  /** callback after successful save */
  onComplete?: (params: { gameId: string; score: number; durationSec: number }) => void;
};

export function GameCard({ game, score: scoreOverride, durationSec: durOverride, onComplete }: Props) {
  const { recordSession } = useGameStats();
  const [saving, setSaving] = useState(false);

  // why: deterministic parse for ranges like "10-15 min"
  const parsedDurationSec = useMemo(() => {
    if (typeof durOverride === "number" && durOverride > 0) return Math.floor(durOverride);
    const m = /(\d+)(?:\s*-\s*(\d+))?\s*min/i.exec(game.duration ?? "");
    if (!m) return 10 * 60;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    const minutes = Number.isFinite(b) && b > 0 ? Math.max(a, b) : a || 10;
    return minutes * 60;
  }, [game.duration, durOverride]);

  async function handleComplete() {
    if (saving) return;
    setSaving(true);
    const score = typeof scoreOverride === "number" ? Math.max(0, Math.floor(scoreOverride)) : Math.floor(Math.random() * 1000); // placeholder
    const durationSec = parsedDurationSec;

    try {
      await recordSession(game.id, score, durationSec);
      onComplete?.({ gameId: game.id, score, durationSec });
    } catch (e: any) {
      console.error("Save session failed:", e?.message || e);
    } finally {
      setSaving(false);
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
          <Button variant="outline" onClick={handleComplete} disabled={saving}>
            {saving ? "Saving…" : "Complete Session"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
// path: components/games/game-card.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameStats } from "@/hooks/use-game-stats";

export type Game = {
  id: string;
  title: string;
  description: string;
  /** e.g. "10-15 min" or "12 min" */
  duration: string;
  bestScore: number;
  isNew?: boolean;
  color?: string;
  borderColor?: string;
};

type Props = {
  game: Game;
  /** optional override when you have a real score from gameplay */
  score?: number;
  /** optional override when gameplay tracks exact duration */
  durationSec?: number;
  /** callback after successful save */
  onComplete?: (params: { gameId: string; score: number; durationSec: number }) => void;
};

export function GameCard({ game, score: scoreOverride, durationSec: durOverride, onComplete }: Props) {
  const { recordSession } = useGameStats();
  const [saving, setSaving] = useState(false);

  // why: deterministic parse for ranges like "10-15 min"
  const parsedDurationSec = useMemo(() => {
    if (typeof durOverride === "number" && durOverride > 0) return Math.floor(durOverride);
    const m = /(\d+)(?:\s*-\s*(\d+))?\s*min/i.exec(game.duration ?? "");
    if (!m) return 10 * 60;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    const minutes = Number.isFinite(b) && b > 0 ? Math.max(a, b) : a || 10;
    return minutes * 60;
  }, [game.duration, durOverride]);

  async function handleComplete() {
    if (saving) return;
    setSaving(true);
    const score = typeof scoreOverride === "number" ? Math.max(0, Math.floor(scoreOverride)) : Math.floor(Math.random() * 1000); // placeholder
    const durationSec = parsedDurationSec;

    try {
      await recordSession(game.id, score, durationSec);
      onComplete?.({ gameId: game.id, score, durationSec });
    } catch (e: any) {
      console.error("Save session failed:", e?.message || e);
    } finally {
      setSaving(false);
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
          <Button variant="outline" onClick={handleComplete} disabled={saving}>
            {saving ? "Saving…" : "Complete Session"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
