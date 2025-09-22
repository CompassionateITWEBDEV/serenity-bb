// path: app/api/progress/route.ts
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Why: unified JSON response the UI expects; never return HTML. */
type Trend = "up" | "down";

export const dynamic = "force-dynamic"; // ensure no stale caching by Next
// export const runtime = "edge"; // optional: uncomment if you run at the edge

export async function GET() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: (key, value, options) => cookieStore.set(key, value, options),
        remove: (key, options) => cookieStore.set(key, "", { ...options, maxAge: 0 }),
      },
    }
  );

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const pid = user.id;

    // Pull all related data in parallel
    const [
      ovr,
      goals,
      mls,
      metrics,
      weekly,
    ] = await Promise.all([
      supabase.from("progress_overview").select("*").eq("patient_id", pid).maybeSingle(),
      supabase
        .from("weekly_goals")
        .select("id,name,current,target,updated_at")
        .eq("patient_id", pid)
        .order("updated_at", { ascending: false }),
      supabase
        .from("milestones")
        .select("id,name,date,completed,type")
        .eq("patient_id", pid)
        .order("date", { ascending: false }),
      supabase
        .from("progress_metrics")
        .select("id,title,value,change,trend,icon,color,bgcolor")
        .eq("patient_id", pid)
        .order("updated_at", { ascending: false })
        .limit(12),
      supabase
        .from("weekly_data")
        .select("id,week,wellness,attendance,goals")
        .eq("patient_id", pid)
        .order("updated_at", { ascending: false })
        .limit(12),
    ]);

    // Bubble up DB errors as JSON
    if (ovr.error) return json({ error: ovr.error.message }, 500);
    if (goals.error) return json({ error: goals.error.message }, 500);
    if (mls.error) return json({ error: mls.error.message }, 500);
    if (metrics.error) return json({ error: metrics.error.message }, 500);
    if (weekly.error) return json({ error: weekly.error.message }, 500);

    // Normalize -> camelCase payload the page.tsx expects
    const payload = {
      overallProgress: Number(ovr.data?.overall_progress ?? 0),
      weeklyGoals: (goals.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        current: Number(g.current ?? 0),
        target: Number(g.target ?? 0),
      })),
      milestones: (mls.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        date: m.date ? String(m.date) : "",
        completed: Boolean(m.completed),
        type: (m.type === "major" ? "major" : "minor") as "major" | "minor",
      })),
      progressMetrics: (metrics.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        value: String(r.value ?? ""),
        change: String(r.change ?? ""),
        trend: (r.trend === "down" ? "down" : "up") as Trend,
        icon: (r.icon as any) ?? undefined,
        color: r.color ?? undefined,
        bgColor: r.bgcolor ?? undefined,
      })),
      weeklyData: (weekly.data ?? []).map((w) => ({
        id: w.id,
        week: w.week,
        wellness: Number(w.wellness ?? 0),
        attendance: Number(w.attendance ?? 0),
        goals: Number(w.goals ?? 0),
      })),
    };

    return json(payload, 200);
  } catch (e: any) {
    // Always return JSON on exceptions
    return json({ error: e?.message || "Internal Server Error" }, 500);
  }
}

/** Handle CORS preflight if your deployment needs it (harmless otherwise). */
export function OPTIONS() {
  return json({}, 204);
}

/** Helper: set JSON + no-store to prevent edge/proxy HTML fallbacks. */
function json(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
