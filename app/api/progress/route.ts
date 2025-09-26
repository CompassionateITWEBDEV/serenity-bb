import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Trend = "up" | "down";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return j({ error: "Missing Supabase env vars" }, 500);

    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (k) => cookies().get(k)?.value,
        set: (k, v, o) => cookies().set(k, v, o),
        remove: (k, o) => cookies().set(k, "", { ...o, maxAge: 0 }),
      },
    });

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) return j({ error: "Unauthorized" }, 401);
    const pid = auth.user.id;

    const [overview, goals, mls, metrics, weekly] = await Promise.all([
      supabase.from("progress_overview").select("overall_progress").eq("patient_id", pid).maybeSingle(),
      supabase.from("weekly_goals").select("id,name,current,target,updated_at").eq("patient_id", pid).order("updated_at", { ascending: false }),
      supabase.from("milestones").select("id,name,date,completed,type").eq("patient_id", pid).order("date", { ascending: true }),
      supabase.from("progress_metrics").select("id,title,value,change,trend,icon,color,bgcolor").eq("patient_id", pid),
      supabase.from("weekly_data").select("id,week,wellness,attendance,goals").eq("patient_id", pid).order("week", { ascending: true }),
    ]);

    const dbErr = overview.error || goals.error || mls.error || metrics.error || weekly.error;
    if (dbErr) return j({ error: dbErr.message }, 500);

    const payload = {
      overallProgress: Number(overview.data?.overall_progress ?? 0),
      weeklyGoals: (goals.data ?? []).map((g) => ({
        id: g.id, name: g.name, current: Number(g.current ?? 0), target: Number(g.target ?? 0),
      })),
      milestones: (mls.data ?? []).map((m) => ({
        id: m.id, name: m.name, date: m.date, completed: Boolean(m.completed), type: (m.type as "major" | "minor") ?? "minor",
      })),
      progressMetrics: (metrics.data ?? []).map((r) => ({
        id: r.id, title: r.title, value: String(r.value ?? ""), change: String(r.change ?? "0"),
        trend: ((r.trend as Trend) ?? "up") as Trend, icon: r.icon ?? undefined, color: r.color ?? undefined, bgColor: r.bgcolor ?? undefined,
      })),
      weeklyData: (weekly.data ?? []).map((w) => ({
        id: w.id, week: w.week, wellness: Number(w.wellness ?? 0), attendance: Number(w.attendance ?? 0), goals: Number(w.goals ?? 0),
      })),
    };

    return j(payload, 200);
  } catch (e: any) {
    return j({ error: e?.message ?? "Internal Error" }, 500);
  }
}

function j(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
