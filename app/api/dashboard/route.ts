// app/api/dashboard/route.ts   (or src/app/... if you use src/)
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
};

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) return json({ error: "Supabase env missing" }, 500);

  const store = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (k) => store.get(k)?.value,
      set: (k, v, o) => store.set(k, v, o),
      remove: (k, o) => store.set(k, "", { ...o, maxAge: 0 }),
    },
  });

  // ✅ Accept Bearer OR cookies
  const authHeader = (await headers()).get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  const { data: ures, error: authErr } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const user = ures?.user;
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);
  const pid = user.id;

  // Fetch all pieces in parallel with graceful error handling
  const results = await Promise.allSettled([
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
    supabase
      .from("weekly_data")
      .select("id,week,wellness,attendance,goals")
      .eq("patient_id", pid)
      .order("week", { ascending: false })
      .limit(1),
    supabase
      .from("notifications")
      .select("id,type,title,message,read,created_at")
      .eq("patient_id", pid)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("token_transactions")
      .select("id,transaction_type,amount,reason,created_at")
      .eq("patient_id", pid)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("drug_tests")
      .select("id,status,scheduled_for,created_at,metadata")
      .eq("patient_id", pid)
      .in("status", ["pending", "completed", "missed"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Extract results with error handling
  const [
    overviewResult,
    goalsResult,
    milestonesResult,
    apptsResult,
    tokensResult,
    weeklyResult,
    noticesResult,
    txnsResult,
    drugTestsResult,
  ] = results;

  // Extract results and handle errors gracefully
  const overview = overviewResult.status === "fulfilled" && !overviewResult.value.error 
    ? overviewResult.value 
    : { data: null, error: overviewResult.status === "rejected" ? { message: "Query failed" } : overviewResult.value?.error || null };
    
  const goals = goalsResult.status === "fulfilled" && !goalsResult.value.error 
    ? goalsResult.value 
    : { data: [], error: goalsResult.status === "rejected" ? { message: "Query failed" } : goalsResult.value?.error || null };
    
  const milestones = milestonesResult.status === "fulfilled" && !milestonesResult.value.error 
    ? milestonesResult.value 
    : { data: [], error: milestonesResult.status === "rejected" ? { message: "Query failed" } : milestonesResult.value?.error || null };
    
  const appts = apptsResult.status === "fulfilled" && !apptsResult.value.error 
    ? apptsResult.value 
    : { data: [], error: apptsResult.status === "rejected" ? { message: "Query failed" } : apptsResult.value?.error || null };
    
  const tokens = tokensResult.status === "fulfilled" && !tokensResult.value.error 
    ? tokensResult.value 
    : { data: null, error: tokensResult.status === "rejected" ? { message: "Query failed" } : tokensResult.value?.error || null };
    
  const weekly = weeklyResult.status === "fulfilled" && !weeklyResult.value.error 
    ? weeklyResult.value 
    : { data: [], error: weeklyResult.status === "rejected" ? { message: "Query failed" } : weeklyResult.value?.error || null };
    
  const notices = noticesResult.status === "fulfilled" && !noticesResult.value.error 
    ? noticesResult.value 
    : { data: [], error: noticesResult.status === "rejected" ? { message: "Query failed" } : noticesResult.value?.error || null };
    
  const txns = txnsResult.status === "fulfilled" && !txnsResult.value.error 
    ? txnsResult.value 
    : { data: [], error: txnsResult.status === "rejected" ? { message: "Query failed" } : txnsResult.value?.error || null };
    
  const drugTests = drugTestsResult.status === "fulfilled" && !drugTestsResult.value.error 
    ? drugTestsResult.value 
    : { data: [], error: drugTestsResult.status === "rejected" ? { message: "Query failed" } : drugTestsResult.value?.error || null };

  // Log warnings for failed queries (but don't fail the entire request)
  const failedQueries: string[] = [];
  if (overview.error) {
    console.warn("Dashboard: Failed to load progress_overview:", overview.error);
    failedQueries.push("progress overview");
  }
  if (goals.error) {
    console.warn("Dashboard: Failed to load weekly_goals:", goals.error);
    failedQueries.push("goals");
  }
  if (milestones.error) {
    console.warn("Dashboard: Failed to load milestones:", milestones.error);
    failedQueries.push("milestones");
  }
  if (appts.error) {
    console.warn("Dashboard: Failed to load appointments:", appts.error);
    failedQueries.push("appointments");
  }
  if (tokens.error) {
    console.warn("Dashboard: Failed to load reward_tokens:", tokens.error);
    failedQueries.push("tokens");
  }
  if (weekly.error) {
    console.warn("Dashboard: Failed to load weekly_data:", weekly.error);
    failedQueries.push("weekly data");
  }
  if (notices.error) {
    console.warn("Dashboard: Failed to load notifications:", notices.error);
    failedQueries.push("notifications");
  }
  if (txns.error) {
    console.warn("Dashboard: Failed to load token_transactions:", txns.error);
    failedQueries.push("transactions");
  }
  if (drugTests.error) {
    console.warn("Dashboard: Failed to load drug_tests:", drugTests.error);
    failedQueries.push("drug tests");
  }

  const overallProgress = Number(overview.data?.overall_progress ?? 0);
  const weeklyGoals = (goals.data ?? []).map((g) => ({
    id: g.id, name: g.name, current: Number(g.current ?? 0), target: Number(g.target ?? 0),
  }));
  const treatmentProgress = (milestones.data ?? []).map((m) => ({
    id: m.id, name: m.name,
    status: m.completed ? "Completed" : "In Progress",
    type: m.type === "major" ? "major" : "minor",
    date: m.date ?? null,
  }));
  const upcomingAppointments = (appts.data ?? []).map((a) => ({
    id: a.id, at: a.appointment_time, staff: a.staff ?? null, status: a.status, notes: a.notes ?? "",
  }));
  const upcomingDrugTests = (drugTests.data ?? []).map((t) => ({
    id: t.id,
    scheduledFor: t.scheduled_for,
    status: t.status || "pending",
    testType: (t as any).metadata?.test_type || "urine",
    createdAt: t.created_at,
    metadata: (t as any).metadata || {},
  }));
  const tokenStats = {
    total: Number(tokens.data?.total_tokens ?? 0),
    earned: Number(tokens.data?.tokens_earned ?? 0),
    spent: Number(tokens.data?.tokens_spent ?? 0),
    level: Number(tokens.data?.level ?? 1),
  };
  const wellness = weekly.data?.[0]
    ? {
        week: weekly.data[0].week,
        wellness: Number(weekly.data[0].wellness ?? 0),
        attendance: Number(weekly.data[0].attendance ?? 0),
        goals: Number(weekly.data[0].goals ?? 0),
      }
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

  const response: any = {
    kpis: { sessions: upcomingAppointments.length, goals: weeklyGoals.length, tokens: tokenStats.total, progressPercent: overallProgress, unreadMessages: unread },
    treatmentProgress,
    upcomingAppointments,
    upcomingDrugTests,
    weeklyGoals,
    tokenStats,
    wellness,
    activity,
  };

  // Include warning in dev mode if any queries failed
  if (failedQueries.length > 0 && process.env.NODE_ENV !== "production") {
    response._warnings = failedQueries;
  }

  return json(response);
}
