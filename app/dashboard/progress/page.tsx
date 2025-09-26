// path: app/dashboard/progress/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/* ===== types & helpers ===== */
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

/** Enhanced fetch with better error handling */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 
        Accept: "application/json", 
        "Content-Type": "application/json",
        ...(init?.headers || {}) 
      },
      credentials: "include",
      cache: "no-store",
    });

    // Handle non-200 responses
    if (!res.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorBody = await res.text();
        if (errorBody) {
          // Check if it's JSON
          try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            // Not JSON, use text
            errorMessage = errorBody.slice(0, 100);
          }
        }
      } catch {
        // Ignore parsing errors
      }
      throw new Error(errorMessage);
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      throw new Error(`Non-JSON response: ${text.slice(0, 100)}...`);
    }

    const body = await res.json();
    return body as T;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
    throw new Error(`Failed to fetch ${url}: Unknown error`);
  }
}

/** Why: tolerate snake_case or camelCase payloads. */
function normalizeProgress(input: any): ProgressPayload {
  if (!input || typeof input !== "object") {
    return { 
      overallProgress: 0, 
      weeklyGoals: [], 
      milestones: [], 
      progressMetrics: [], 
      weeklyData: [] 
    };
  }

  const overall =
    input.overallProgress ??
    input.overall_progress ??
    input?.overview?.overall_progress ??
    input?.overview?.overallProgress ??
    0;

  return {
    overallProgress: Number(overall) || 0,
    weeklyGoals: Array.isArray(input.weeklyGoals ?? input.weekly_goals) ? (input.weeklyGoals ?? input.weekly_goals) : [],
    milestones: Array.isArray(input.milestones) ? input.milestones : [],
    progressMetrics: Array.isArray(input.progressMetrics ?? input.progress_metrics)
      ? (input.progressMetrics ?? input.progress_metrics)
      : [],
    weeklyData: Array.isArray(input.weeklyData ?? input.weekly_data)
      ? (input.weeklyData ?? input.weekly_data)
      : [],
  };
}

export default function ProgressPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  // Fix: Use user_id instead of id (common in Supabase auth)
  const userId = useMemo(() => {
    if (!patient) return null;
    return (patient.user_id || patient.id || patient.userId || null) as string | null;
  }, [patient]);

  const [initializing, setInitializing] = useState(true);
  const [data, setData] = useState<ProgressPayload>({
    overallProgress: 0,
    weeklyGoals: [],
    milestones: [],
    progressMetrics: [],
    weeklyData: [],
  });
  const [err, setErr] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Redirect once when unauthenticated
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!loading && !isAuthenticated && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Fetch with retry logic
  const fetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (fetchedRef.current === userId && retryCount === 0) return; // already fetched for this user

    fetchedRef.current = userId;
    const ac = new AbortController();

    (async () => {
      try {
        const { data: sessionRes, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        const token = sessionRes.session?.access_token;
        
        if (!token) {
          throw new Error("No access token available");
        }

        const payload = await fetchJson<any>("/api/progress", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: ac.signal,
        });

        setData(normalizeProgress(payload));
        setErr(null);
        setRetryCount(0); // Reset retry count on success
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        
        const errorMessage = e?.message || "Failed to load progress";
        console.error("Progress fetch error:", e);
        setErr(errorMessage);
        
        // Auto-retry logic for certain errors
        if (retryCount < 2 && (
          errorMessage.includes("fetch") || 
          errorMessage.includes("network") ||
          errorMessage.includes("500")
        )) {
          setTimeout(() => setRetryCount(prev => prev + 1), 2000);
        }
      } finally {
        setInitializing(false);
      }
    })();

    return () => ac.abort();
  }, [isAuthenticated, userId, retryCount]);

  // Manual retry function
  const handleRetry = () => {
    setErr(null);
    setInitializing(true);
    setRetryCount(prev => prev + 1);
  };

  // First paint: only show spinner once
  if (loading || (isAuthenticated && initializing)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center" aria-live="polite" aria-busy="true">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading progress…</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">Retry attempt {retryCount}/2</p>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
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
          
          {/* Enhanced error display with retry button */}
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-800">Unable to load progress data</h3>
                  <p className="text-sm text-red-600 mt-1">{err}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
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
          {progressMetrics.length === 0 ? (
            <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500">Progress metrics will appear here once data is available</p>
            </div>
          ) : (
            progressMetrics.map((metric, i) => {
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
            })
          )}
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
                  <p className="text-sm text-gray-500">No goals yet. They will appear here once set by your care team.</p>
                )}
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
                {milestones.length === 0 && (
                  <p className="text-sm text-gray-500">No milestones yet. They will appear as you progress through your recovery journey.</p>
                )}
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
                {weeklyData.length === 0 && (
                  <p className="text-sm text-gray-500">No trend data yet. Weekly progress will be tracked here.</p>
                )}
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
