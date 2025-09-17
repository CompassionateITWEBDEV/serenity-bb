"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Calendar,
  Target,
  Heart,
  Clock,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type Trend = "up" | "down";
type ProgressPayload = {
  overallProgress: number;
  weeklyGoals: { id?: number | string; name: string; current: number; target: number }[];
  milestones: { id?: number | string; name: string; date: string; completed: boolean; type: "major" | "minor" }[];
  progressMetrics: {
    id?: number | string;
    title: string;
    value: string;
    change: string;
    trend: Trend;
    icon?: "Calendar" | "Heart" | "Target" | "CheckCircle";
    color?: string;
    bgColor?: string;
  }[];
  weeklyData: { id?: number | string; week: string; wellness: number; attendance: number; goals: number }[];
};

const iconMap: Record<string, React.ComponentType<any>> = {
  Calendar,
  Heart,
  Target,
  CheckCircle,
};

export default function ProgressPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  const [fetching, setFetching] = useState(true);
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Redirect if not authed OR missing patient (was causing blank screen)
  useEffect(() => {
    if (!loading && (!isAuthenticated || !patient)) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, patient, router]);

  // (Optional) Load real data; keep working if API not wired yet
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!isAuthenticated || !patient) return;
      try {
        const res = await fetch("/api/progress", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json: ProgressPayload = await res.json();
        if (alive) setData(json);
        setErr(null);
      } catch (e: any) {
        // Show UI with static safe defaults instead of a white page
        if (alive) {
          setErr(e?.message ?? "Failed to load progress");
          setData({
            overallProgress: 0,
            weeklyGoals: [
              { name: "Medication Adherence", current: 0, target: 7 },
              { name: "Therapy Sessions", current: 0, target: 2 },
            ],
            milestones: [],
            progressMetrics: [
              { title: "Treatment Days", value: "0", change: "0", trend: "up", icon: "Calendar" },
            ],
            weeklyData: [],
          });
        }
      } finally {
        if (alive) setFetching(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [isAuthenticated, patient]);

  // Global loading (auth or fetch)
  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  // If still not allowed, show a small non-null fallback while redirecting
  if (!isAuthenticated || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <p className="text-gray-600">Redirecting to login…</p>
      </div>
    );
  }

  // Use API data when present, otherwise graceful defaults
  const overallProgress = data?.overallProgress ?? 0;
  const weeklyGoals = data?.weeklyGoals ?? [];
  const milestones = data?.milestones ?? [];
  const progressMetrics = data?.progressMetrics ?? [];
  const weeklyData = data?.weeklyData ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Progress Tracking</h1>
              <p className="text-gray-600">Monitor your recovery journey and celebrate achievements</p>
            </div>
          </div>
          {err && <p className="text-sm text-red-600">Error: {err}</p>}
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Recovery Progress</span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {overallProgress}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-4 mb-4" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Started Treatment</span>
              <span>Current Progress</span>
              <span>Recovery Goals</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {progressMetrics.map((metric, i) => {
            const Icon = (metric.icon && iconMap[metric.icon]) || Calendar;
            return (
              <Card key={metric.id ?? `${metric.title}-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${metric.bgColor ?? "bg-gray-100"}`}>
                      <Icon className={`h-6 w-6 ${metric.color ?? "text-gray-600"}`} />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        metric.trend === "up" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {metric.trend === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      {metric.change}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                    <div className="text-sm text-gray-600">{metric.title}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="weekly" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">Weekly Goals</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Weekly Goals */}
          <TabsContent value="weekly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>This Week&apos;s Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {weeklyGoals.length === 0 && (
                  <p className="text-sm text-gray-500">No goals yet. They will appear here.</p>
                )}
                {weeklyGoals.map((goal, i) => {
                  const percentage = goal.target ? Math.round((goal.current / goal.target) * 100) : 0;
                  return (
                    <div key={(goal as any).id ?? `${goal.name}-${i}`} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-sm text-gray-600">
                          {goal.current}/{goal.target}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{percentage}% complete</span>
                        <span>{Math.max(goal.target - goal.current, 0)} remaining</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones */}
          <TabsContent value="milestones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recovery Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 && (
                  <p className="text-sm text-gray-500">No milestones yet.</p>
                )}
                <div className="space-y-4">
                  {milestones.map((milestone, i) => (
                    <div key={(milestone as any).id ?? `${milestone.name}-${i}`} className="flex items-center gap-4 p-4 rounded-lg border">
                      <div
                        className={`p-2 rounded-full ${
                          milestone.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {milestone.completed ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{milestone.name}</div>
                        <div className="text-sm text-gray-600">{milestone.date}</div>
                      </div>
                      <Badge variant={milestone.type === "major" ? "default" : "outline"}>
                        {milestone.type === "major" ? "Major" : "Minor"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Trends */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyData.length === 0 && (
                  <p className="text-sm text-gray-500">No trend data yet.</p>
                )}
                <div className="space-y-6">
                  {weeklyData.map((week, i) => (
                    <div key={(week as any).id ?? `${week.week}-${i}`} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{week.week}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-pink-600">Wellness: {week.wellness}/10</span>
                          <span className="text-green-600">Attendance: {week.attendance}%</span>
                          <span className="text-blue-600">Goals: {week.goals}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Progress value={Math.max(0, Math.min(100, week.wellness * 10))} className="h-2" />
                        <Progress value={Math.max(0, Math.min(100, week.attendance))} className="h-2" />
                        <Progress value={Math.max(0, Math.min(100, week.goals))} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
