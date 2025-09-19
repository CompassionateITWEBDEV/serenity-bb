// /app/api/progress/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "missing_token" }, { status: 401 });
    }

    // Validate token (no redirect; server-side check)
    const supabase = createClient(url, anon);
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    // TODO: fetch real data for userRes.user.id
    const payload = {
      overallProgress: 0,
      weeklyGoals: [],
      milestones: [],
      progressMetrics: [],
      weeklyData: [],
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
