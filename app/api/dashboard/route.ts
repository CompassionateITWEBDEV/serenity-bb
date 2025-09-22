import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) return json({ error: "Supabase env missing" }, 500);

  const store = cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (k) => store.get(k)?.value,
      set: (k, v, o) => store.set(k, v, o),
      remove: (k, o) => store.set(k, "", { ...o, maxAge: 0 }),
    },
  });

  const { data: ures } = await supabase.auth.getUser();
  const user = ures?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const pid = user.id;

  const [
    overview,
    goals,
    milestones,
    appts,
    tokens,
    weekly,
    notices,
    txns,
  ] = await Promise.all([
    supabase.from("progress_overview").select("*").eq("patient_id", pid).maybeSingle(),
    supabase.from("weekly_goals").select("id,name,current,target,updated_at").eq("patient_id", pid),
    supabase.from("milestones").select("id,name,date,completed,type,updated_at").eq("patient_id", pid),
    supabase
      .from("appointments")
      .select("id,appointment_time,staff,notes,status")
      .eq("patient_id", pid)
      .gte("appointment_time", new Date().toISOString())
      .order("appointment_time", { ascending: true })
      .limit(3),
    supabase.from("reward_tokens").select("tokens_earned,tokens_spent,total_tokens,level").eq("patient_id", pid).maybeSingle(),
    supabase.from("weekly_data").select("id,week,wellness,attendance,goals,updated_at").eq("patient_id", pid).order("updated_at", { ascending: false }).limit(1),
    supabase.from("notifications").select("id,type,title,message,read,created_at").eq("patient_id", pid).order("created_at", { ascending: false }).limit(10),
    supabase.from("token_transactions").select("id,transaction_type,amount,reason,created_at").eq("patient_id", pid).order("created_at", { ascending: false }).limit(10),
  ]);

  for (const r of [overview, goals, milestones, appts, tokens, weekly, notices, txns]) {
    if ((r as any).error) return json({ error: (r as any).error.message }, 500);
  }

  const overallProgress = Number(overview.data?.overall_progress ?? 0);
  const weeklyGoals = (goals.data ?? []).map((g) => ({ id: g.id, name: g.name, current: Number(g.current ?? 0), target: Number(g.target ?? 0) }));
  const treatmentProgress = (milestones.data ?? []).map((m) => ({
    id: m.id, name: m.name, status: m.completed ? "Completed" : "In Progress", type: m.type === "major" ? "major" : "minor", date: m.date ?? null,
  }));
  const upcomingAppointments = (appts.data ?? []).map((a) => ({
    id: a.id, at: a.appointment_time, staff: a.staff ?? null, status: a.status, notes: a.notes ?? "",
  }));
  const tokenStats = {
    total: Number(tokens.data?.total_tokens ?? 0),
    earned: Number(tokens.data?.tokens_earned ?? 0),
    spent: Number(tokens.data?.tokens_spent ?? 0),
    level: Number(tokens.data?.level ?? 1),
  };
  const wellness = weekly.data?.[0]
    ? { week: weekly.data[0].week, wellness: Number(weekly.data[0].wellness ?? 0), attendance: Number(weekly.data[0].attendance ?? 0), goals: Number(weekly.data[0].goals ?? 0) }
    : null;
  const unread = (notices.data ?? []).filter((n) => !n.read).length;
  const activity = [
    ...(notices.data ?? []).map((n) => ({ id: `n-${n.id}`, ts: n.created_at, kind: "notification", summary: n.title, meta: n.type })),
    ...(txns.data ?? []).map((t) => ({ id: `t-${t.id}`, ts: t.created_at, kind: "token", summary: `${t.transaction_type} ${t.amount} tokens`, meta: t.reason })),
    ...(milestones.data ?? []).map((m) => ({ id: `m-${m.id}`, ts: m.updated_at ?? m.date, kind: "milestone", summary: m.name, meta: m.completed ? "completed" : "updated" })),
  ]
    .filter((x) => x.ts)
    .sort((a, b) => new Date(b.ts!).getTime() - new Date(a.ts!).getTime())
    .slice(0, 15);

  return json({
    kpis: { sessions: upcomingAppointments.length, goals: weeklyGoals.length, tokens: tokenStats.total, progressPercent: overallProgress, unreadMessages: unread },
    treatmentProgress,
    upcomingAppointments,
    weeklyGoals,
    tokenStats,
    wellness,
    activity,
  });
}
