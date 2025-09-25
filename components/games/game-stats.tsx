"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, Target, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGameStats } from "./use-game-stats";

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function GameStats() {
  const { patient } = useAuth();
  const stats = useGameStats(patient?.id);

  const items = [
    { title: "Games Played", value: stats?.games_played ?? 0, icon: Target, color: "text-blue-600", bg: "bg-blue-100", change: "" },
    { title: "Total Play Time", value: stats ? fmtTime(stats.total_time_sec) : "—", icon: Clock, color: "text-green-600", bg: "bg-green-100", change: "" },
    { title: "High Scores", value: stats?.high_score ?? 0, icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100", change: "" },
    { title: "Streak", value: `${stats?.streak_days ?? 0} days`, icon: Zap, color: "text-purple-600", bg: "bg-purple-100", change: "" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <div className={`p-2 rounded-full ${s.bg}`}>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              {s.change ? <p className="text-xs text-muted-foreground">{s.change}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
