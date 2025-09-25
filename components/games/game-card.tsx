"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, Trophy } from "lucide-react";
import { useState } from "react";

interface Game { id: string; title: string; description: string; category: string; difficulty: string; duration: string; icon: any; color: string; borderColor: string; lastPlayed: string; bestScore: number; isNew: boolean; }
interface GameCardProps { game: Game }

export function GameCard({ game }: GameCardProps) {
  const Icon = game.icon;
  const [loading, setLoading] = useState(false);
  const [awarded, setAwarded] = useState<number | null>(null);

  async function completeDemoSession() {
    // why: quick demo button for real-time + reward flow without a full game engine
    setLoading(true);
    setAwarded(null);
    try {
      const res = await fetch("/api/games/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          score: Math.floor(600 + Math.random() * 400),      // 600-1000
          durationSec: Math.floor(5 * 60 + Math.random() * 600), // 5-15 min
        }),
      });
      const json = await res.json();
      if (res.ok) setAwarded(json.tokensAwarded ?? 0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={`border ${game.borderColor}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${game.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{game.title}</h3>
              <p className="text-sm text-gray-600">{game.description}</p>
            </div>
          </div>
          {game.isNew && <Badge>New</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" />Duration: {game.duration}</div>
          <div className="flex items-center gap-2"><Trophy className="w-4 h-4" />Best Score: {game.bestScore}</div>
        </div>

        <div className="flex gap-3">
          <Link href={`/dashboard/games/${game.id}`} className="w-full">
            <Button className="w-full" variant="default">Continue Playing</Button>
          </Link>
          <Button className="w-full" variant="outline" onClick={completeDemoSession} disabled={loading}>
            {loading ? "Saving..." : "Complete Session"}
          </Button>
        </div>
        {awarded != null && (
          <p className="text-xs text-green-700 mt-3">Rewarded {awarded} tokens 🎉</p>
        )}
      </CardContent>
    </Card>
  );
}
