// path: app/dashboard/progress/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
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
  type Icon as LucideIcon,
} from "lucide-react";

/* ───────── helpers ───────── */
type Trend = "up" | "down";
type IconName = "Calendar" | "Heart" | "Target" | "CheckCircle";

type ProgressPayload = {
  overallProgress: number;
  weeklyGoals: Array<{ id?: string | number; name: string; current: number; target: number }>;
  milestones: Array<{ id?: string | number; name: string; date: string; completed: boolean; type: "major" | "minor" }>;
  progressMetrics: Array<{
    id?: string | number;
    title: string;
    value: string;
    change: string;
    trend: Trend;
    icon?: IconName;
    color?: string;
    bgColor?: string;
  }>;
  weeklyData: Array<{ id?: string | number; week: string; wellness: number; attendance: number; goals: number }>;
};

const iconMap: Record<IconName, LucideIcon> = { Calendar, Heart, Target, CheckCircle };
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/** Why: Guard against HTML/redirects; only accept JSON. */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    credentials: "include",
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Non-JSON response ${res.status}: ${text.slice(0, 140)}…`);
  }
  const body = await res.json();
  if (!res.ok) throw new Error((body && (body.error || body.message)) || `HTTP ${res.status}`);
  return body as T;
}

/** Why: Accept either camelCase (your current) or snake_case (direct DB API) */
function normalizeProgress(input: any): ProgressPayload {
  if (!input || typeof input !== "object") {
    return { overallProgress: 0, weeklyGoals: [], milestones: [], progressMetrics: [], weeklyData: [] };
  }

  const overallProgress =
    input.overallProgress ??
    input.overall_progress ??
    input?.overview?.overall_progress ??
    input?.overview?.overallProgress ??
    0;

  const weeklyGoals =
    input.weeklyGoals ??
    input.weekly_goals ??
    [];

  const milestones =
    input.milestones ??
    input.milestones_list ??
    [];

  const progressMetrics =
    input.progressMetrics ??
    input.progress_metrics ??
    [];

  const weeklyData =
    input.weeklyData ??
    input.weekly_data ??
    [];

  return {
    overallProgress: Number.isFinite(overallProgress) ? Number(overallProgress) : 0,
    weeklyGoals: Array.isArray(weeklyGoals) ? weeklyGoals : [],
    milestones: Array.isArray(milestones) ? milestones : [],
    progressMetrics: Array.isArray(progressMetrics) ? progressMetrics : [],
    weeklyData: Array.isArray(weeklyData) ? weeklyData : [],
  };
}

export default function ProgressPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  const [fetching, setFetching] = useState(true);
  const [data, setData] = useState<ProgressPayload>({
    overallProgress: 0,
    weeklyGoals: [],
    milestones: [],
    progressMetrics: [],
    weeklyData: [],
  });
  const [err, setErr] = useState<string | null>(null);

  // Redirect if not authed OR missing patient
  useEffect(() => {
    if (!loading && (!isAuthenticated || !patient)) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, patient, router]);

  // Load data with strict JSON handling
  useEffect(() => {
    if (!isAuthenticated || !patient) return;

    const ac = new AbortController();
    let alive = true;

    (async () => {
      setFetching(true);
      setErr(null);
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const token = sessionRes.session?.access_token;

        const payload = await fetchJson<any>("/api/progress", {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: ac.signal,
        });

        if (!alive) return;
        setData(normalizeProgress(payload));
      } catch (e: any) {
        if (!alive || (e?.name === "AbortError")) return;
        setErr(e?.message || "Failed to load progress");
        setData({ overallProgress: 0, weeklyGoals: [], milestones: [], progressMetrics: [], weeklyData: [] });
      } finally {
        if (alive) setFetching(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [isAuthenticated, patient]);

  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center" aria-live="polite" aria-busy="true">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading progress…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <p className="text-gray-600">Redirecting to login…</p>
      </div>
    );
  }

  const overallProgress = clamp(data.overallProgress ?? 0);
  const weeklyGoals = data.weeklyGoals ?? [];
  const milestones = data.milestones ?? [];
  const progressMetrics = data.progressMetrics ?? [];
  const weeklyData = data.weeklyData ?? [];

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
              <Badge variant="outline" className="text-lg px-3 py-1" aria-label={`Overall progress ${overallProgress}%`}>
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
            const Icon = metric.icon ? iconMap[metric.icon] : Calendar;
            const key = String(metric.id ?? `${metric.title}-${i}`);
            return (
              <Card key={key}>
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
                {weeklyGoals.length === 0 && <p className="text-sm text-gray-500">No goals yet. They will appear here.</p>}
                {weeklyGoals.map((goal, i) => {
                  const pct = goal.target > 0 ? Math.round(clamp((goal.current / goal.target) * 100)) : 0;
                  const key = String((goal as any).id ?? `${goal.name}-${i}`);
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-sm text-gray-600">
                          {goal.current}/{goal.target}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{pct}% complete</span>
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
                {milestones.length === 0 && <p className="text-sm text-gray-500">No milestones yet.</p>}
                <div className="space-y-4">
                  {milestones.map((m, i) => {
                    const key = String((m as any).id ?? `${m.name}-${i}`);
                    return (
                      <div key={key} className="flex items-center gap-4 p-4 rounded-lg border">
                        <div className={`p-2 rounded-full ${m.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                          {m.completed ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-sm text-gray-600">{m.date}</div>
                        </div>
                        <Badge variant={m.type === "major" ? "default" : "outline"}>
                          {m.type === "major" ? "Major" : "Minor"}
                        </Badge>
                      </div>
                    );
                  })}
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
                {weeklyData.length === 0 && <p className="text-sm text-gray-500">No trend data yet.</p>}
                <div className="space-y-6">
                  {weeklyData.map((w, i) => {
                    const key = String((w as any).id ?? `${w.week}-${i}`);
                    return (
                      <div key={key} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{w.week}</span>
                          <div className="flex gap-4 text-sm">
                            <span className="text-pink-600">Wellness: {w.wellness}/10</span>
                            <span className="text-green-600">Attendance: {clamp(w.attendance)}%</span>
                            <span className="text-blue-600">Goals: {clamp(w.goals)}%</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Progress value={clamp(w.wellness * 10)} className="h-2" />
                          <Progress value={clamp(w.attendance)} className="h-2" />
                          <Progress value={clamp(w.goals)} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
