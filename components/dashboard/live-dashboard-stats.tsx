"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Target, TrendingUp } from "lucide-react";
import { useOverview } from "@/context/patient-overview-context";

export function LiveDashboardStats() {
  const { overview, isNew, isLoading } = useOverview();

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-16 rounded bg-gray-200 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const s = {
    days: overview.daysInProgram,
    sessions: overview.sessionsCompleted,
    goals: overview.goalsAchieved,
    progress: Math.max(0, Math.min(100, overview.progressScore)),
  };

  const tiles = [
    { title: "Days in Program", value: s.days, icon: Calendar },
    { title: "Sessions Completed", value: s.sessions, icon: Clock },
    { title: "Goals Achieved", value: s.goals, icon: Target },
    { title: "Progress Score", value: `${s.progress}%`, icon: TrendingUp },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {tiles.map(({ title, value, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {title}
              {isNew && title === "Progress Score" ? " (New)" : ""}
            </CardTitle>
            <div className="rounded-lg p-2 bg-gray-50">
              <Icon className="h-4 w-4 text-gray-900" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {title === "Progress Score" && <Progress value={s.progress} className="mt-2" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default LiveDashboardStats;
