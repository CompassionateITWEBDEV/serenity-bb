import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (k) => cookieStore.get(k)?.value } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // patient_id == auth user id in your schema
  const pid = user.id;

  // Fetch all three in parallel
  const [ovr, goals, mls] = await Promise.all([
    supabase.from("progress_overview").select("*").eq("patient_id", pid).maybeSingle(),
    supabase.from("weekly_goals").select("*").eq("patient_id", pid).order("updated_at", { ascending: false }),
    supabase.from("milestones").select("*").eq("patient_id", pid).order("date", { ascending: false }),
  ]);

  // Normalize errors to JSON
  if (ovr.error) return NextResponse.json({ error: ovr.error.message }, { status: 500 });
  if (goals.error) return NextResponse.json({ error: goals.error.message }, { status: 500 });
  if (mls.error) return NextResponse.json({ error: mls.error.message }, { status: 500 });

  return NextResponse.json({
    overview: ovr.data ?? { patient_id: pid, overall_progress: 0, updated_at: null },
    goals: goals.data ?? [],
    milestones: mls.data ?? [],
  });
}
