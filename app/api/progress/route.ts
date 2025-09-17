import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

  const [overview, weeklyGoals, milestones, metrics, weeklyData] = await Promise.all([
    supabase.from("progress_overview").select("overall_progress").eq("patient_id", pid).single(),
    supabase.from("weekly_goals").select("id, name, current, target").eq("patient_id", pid).order("id"),
    supabase.from("milestones").select("id, name, date, completed, type").eq("patient_id", pid).order("date"),
    supabase
      .from("progress_metrics")
      .select("id, title, value, change, trend, icon, color, bgColor")
      .eq("patient_id", pid)
      .order("id"),
    supabase.from("weekly_data").select("id, week, wellness, attendance, goals").eq("patient_id", pid).order("id"),
  ]);

  const hadError = overview.error || weeklyGoals.error || milestones.error || metrics.error || weeklyData.error;
  if (hadError) {
    return NextResponse.json(
      {
        error: "Failed to fetch progress data",
        details: {
          overview: overview.error?.message,
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
    overallProgress: overview.data?.overall_progress ?? 0,
    weeklyGoals: weeklyGoals.data ?? [],
    milestones: milestones.data ?? [],
    progressMetrics: metrics.data ?? [],
    weeklyData: weeklyData.data ?? [],
  });
}
