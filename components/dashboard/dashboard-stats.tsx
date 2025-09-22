// components/dashboard/dashboard-stats.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Target, TrendingUp } from "lucide-react";

type Goals = { achieved: number; total: number };
export type DashboardStatsProps = {
  /** ISO date string (e.g., "2025-09-01"). Used to compute days in program. */
  joinDate?: string | null;
  /** Total finished sessions/appointments/etc. */
  sessionsCompleted?: number | null;
  /** Achieved goals out of total. */
  goalsAchieved?: Goals | null;
  /** Overall progress in percent (0–100). */
  progressPercent?: number | null;
  className?: string;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function daysBetweenUTC(fromISO?: string | null): number | null {
  if (!fromISO) return null;
  const start = new Date(fromISO);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  // Why: normalize to UTC midnight diff to avoid TZ drift
  const ms =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  return days < 0 ? 0 : days;
}

export function DashboardStats({
  joinDate,
  sessionsCompleted,
  goalsAchieved,
  progressPercent,
  className = "",
}: DashboardStatsProps) {
  const days = daysBetweenUTC(joinDate); // null -> new patient
  const sessions = typeof sessionsCompleted === "number" && sessionsCompleted >= 0 ? sessionsCompleted : null;

  const achieved = goalsAchieved?.achieved ?? null;
  const total = goalsAchieved?.total ?? null;
  const validGoals =
    typeof achieved === "number" && achieved >= 0 && typeof total === "number" && total >= 0;
  const goalsLabel =
    validGoals ? `${achieved}/${total}` : "—";

  const pct =
    typeof progressPercent === "number" && isFinite(progressPercent)
      ? clamp(Math.round(progressPercent))
      : null;

  const stats = [
    {
      title: "Days in Program",
      value: days === null ? "—" : String(days),
      icon: Calendar,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
    {
      title: "Sessions Completed",
      value: sessions === null ? "—" : String(sessions),
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Goals Achieved",
      value: goalsLabel,
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Progress Score",
      value: pct === null ? "—" : `${pct}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      progress: pct, // only show bar if not null
    },
  ] as const;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} aria-label={`${stat.title}: ${stat.value}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              {typeof (stat as any).progress === "number" ? (
                <Progress value={(stat as any).progress} className="mt-2" />
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
