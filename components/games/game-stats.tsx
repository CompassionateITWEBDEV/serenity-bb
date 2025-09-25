"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BatteryCharging, Timer, Trophy, Zap } from "lucide-react";
import { useGameStats } from "@/hooks/use-game-stats";

export function GameStats() {
  const { loading, summary } = useGameStats();
  const { gamesPlayed, totalMinutes, highScore, streakDays } = summary;

  const Tile = ({
    label,
    value,
    Icon,
  }: {
    label: string;
    value: string | number;
    Icon: any;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "…" : value}</p>
          </div>
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile label="Games Played" value={gamesPlayed} Icon={BatteryCharging} />
      <Tile label="Total Play Time" value={`${totalMinutes} min`} Icon={Timer} />
      <Tile label="High Scores" value={highScore} Icon={Trophy} />
      <Tile label="Streak" value={`${streakDays} days`} Icon={Zap} />
    </div>
  );
}
