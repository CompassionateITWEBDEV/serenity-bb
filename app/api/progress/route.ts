import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type MetricTrend = "up" | "down";

export async function GET() {
  const supabase = supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pid = user.id;

  // --- Existence checks (fast head queries)
  const [goalsHead, milestonesHead, metricsHead, weeklyHead, overviewHead] = await Promise.all([
    supabase.from("weekly_goals").select("id", { count: "exact", head: true }).eq("patient_id", pid),
    supabase.from("milestones").select("id", { count: "exact", head: true }).eq("patient_id", pid),
    supabase.from("progress_metrics").select("id", { count: "exact", head: true }).eq("patient_id", pid),
    supabase.from("weekly_data").select("id", { count: "exact", head: true }).eq("patient_id", pid),
    supabase.from("progress_overview").select("patient_id", { count: "exact", head: true }).eq("patient_id", pid),
  ]);

  const isEmpty =
    (goalsHead.count ?? 0) === 0 &&
    (milestonesHead.count ?? 0) === 0 &&
    (metricsHead.count ?? 0) === 0 &&
    (weeklyHead.count ?? 0) === 0 &&
    (overviewHead.count ?? 0) === 0;

  // --- Seed defaults once for a new patient (start from the beginning)
  if (isEmpty) {
    const defaults = {
      weekly_goals: [
        { name: "Medication Adherence", current: 0, target: 7 },
        { name: "Therapy Sessions", current: 0, target: 2 },
        { name: "Group Activities", current: 0, target: 4 },
        { name: "Wellness Check-ins", current: 0, target: 7 },
      ],
      milestones: [
        { name: "First Group Session", date: new Date().toISOString().slice(0, 10), completed: false, type: "minor" },
        { name: "30 Days Clean", date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), completed: false, type: "major" },
      ],
      progress_metrics: [
        { title: "Treatment Days", value: "0", change: "0", trend: "up" as MetricTrend, icon: "Calendar", color: "text-blue-600", bgColor: "bg-blue-100" },
        { title: "Wellness Score", value: "0.0", change: "0.0", trend: "up" as MetricTrend, icon: "Heart", color: "text-pink-600", bgColor: "bg-pink-100" },
        { title: "Session Attendance", value: "0%", change: "0%", trend: "up" as MetricTrend, icon: "CheckCircle", color: "text-green-600", bgColor: "bg-green-100" },
        { title: "Goal Completion", value: "0%", change: "0%", trend: "up" as MetricTrend, icon: "Target", color: "text-orange-600", bgColor: "bg-orange-100" },
      ],
      weekly_data: [
        { week: "Week 1", wellness: 0, attendance: 0, goals: 0 },
      ],
      overview: { overall_progress: 0 },
    };

    // Inserts respect RLS: patient_id must equal auth.uid()
    const [g, m, pm, wd, ov] = await Promise.all([
      supabase.from("weekly_goals").insert(defaults.weekly_goals.map((x) => ({ ...x, patient_id: pid }))),
      supabase.from("milestones").insert(defaults.milestones.map((x) => ({ ...x, patient_id: pid }))),
      supabase.from("progress_metrics").insert(defaults.progress_metrics.map((x) => ({ ...x, patient_id: pid }))),
      supabase.from("weekly_data").insert(defaults.weekly_data.map((x) => ({ ...x, patient_id: pid }))),
      supabase.from("progress_overview").insert({ patient_id: pid, overall_progress: defaults.overview.overall_progress }),
    ]);

    const err = g.error || m.error || pm.error || wd.error || ov.error;
    if (err) {
      return NextResponse.json({ error: "Failed to seed defaults", detail: err.message }, { status: 500 });
    }
  }

  // --- Fetch fresh data
  const [overview, weeklyGoals, milestones, metrics, weeklyData] = await Promise.all([
    supabase.from("progress_overview").select("overall_progress").eq("patient_id", pid).single(),
    supabase.from("weekly_goals").select("id, name, current, target").eq("patient_id", pid).order("id"),
    supabase.from("milestones").select("id, name, date, completed, type").eq("patient_id", pid).order("date"),
    supabase.from("progress_metrics").select("id, title, value, change, trend, icon, color, bgColor").eq("patient_id", pid).order("id"),
    supabase.from("weekly_data").select("id, week, wellness, attendance, goals").eq("patient_id", pid).order("id"),
  ]);

  // If overview missing (e.g., someone truncated), compute quickly from goals:
  let overallProgress = overview.data?.overall_progress ?? 0;
  if (overview.error && (weeklyGoals.data?.length ?? 0) > 0) {
    const pct = averagePercent(weeklyGoals.data!);
    overallProgress = Math.round(pct);
    // try to upsert (best effort)
    await supabase.from("progress_overview").upsert({ patient_id: pid, overall_progress: overallProgress });
  }

  if (weeklyGoals.error || milestones.error || metrics.error || weeklyData.error) {
    return NextResponse.json(
      {
        error: "Failed to load progress",
        details: {
          weeklyGoals: weeklyGoals.error?.message,
          milestones: milestones.error?.message,
          metrics: metrics.error?.message,
          weeklyData: weeklyData.error?.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    overallProgress,
    weeklyGoals: weeklyGoals.data ?? [],
    milestones: milestones.data ?? [],
    progressMetrics: metrics.data ?? [],
    weeklyData: weeklyData.data ?? [],
  });
}

function averagePercent(
  goals: Array<{ current: number; target: number }>
): number {
  if (!goals.length) return 0;
  const values = goals.map((g) => (g.target ? Math.min(100, (g.current / g.target) * 100) : 0));
  return values.reduce((a, b) => a + b, 0) / values.length;
}
