import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Trend = "up" | "down";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200, tag?: string) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  if (tag) res.headers.set("x-debug", `progress:${tag}`);
  return res;
}

export async function GET(req: Request) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Missing Supabase env vars" }, 500, "env");

  // 1) Prefer Bearer token (client-guarded apps won’t have SSR cookies)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Build Supabase client. If we have a Bearer token, attach it to global headers.
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (k) => cookies().get(k)?.value,
      set: (k, v, o?: CookieOptions) => cookies().set(k, v, o),
      remove: (k, o?: CookieOptions) => cookies().set(k, "", { ...o, maxAge: 0 }),
    },
    global: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined,
  });

  // 2) Resolve user either via Bearer or SSR cookies
  const { data: userRes, error: authErr } = await supabase.auth.getUser(bearer || undefined);
  if (authErr || !userRes?.user) {
    return json({ error: "Unauthorized" }, 401, "no-user");
  }
  const pid = userRes.user.id;

  // 3) Fetch data (RLS restricts to auth.uid())
  const [overview, goals, mls, metrics, weekly] = await Promise.all([
    supabase.from("progress_overview").select("overall_progress").eq("patient_id", pid).maybeSingle(),
    supabase.from("weekly_goals").select("id,name,current,target,updated_at").eq("patient_id", pid).order("updated_at", { ascending: false }),
    supabase.from("milestones").select("id,name,date,completed,type").eq("patient_id", pid).order("date", { ascending: true }),
    supabase.from("progress_metrics").select("id,title,value,change,trend,icon,color,bgcolor").eq("patient_id", pid),
    supabase.from("weekly_data").select("id,week,wellness,attendance,goals").eq("patient_id", pid).order("week", { ascending: true }),
  ]);

  // Handle missing weekly_goals table gracefully (PGRST205 = table not found)
  const goalsData = goals.error?.code === 'PGRST205' ? { data: [], error: null } : goals;
  const dbErr = overview.error || (goalsData.error || null) || mls.error || metrics.error || weekly.error;
  if (dbErr) return json({ error: dbErr.message }, 500, "db");

  const payload = {
    overallProgress: Number(overview.data?.overall_progress ?? 0),
    weeklyGoals: (goalsData.data ?? []).map((g) => ({
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

  return json(payload, 200, "ok");
}
