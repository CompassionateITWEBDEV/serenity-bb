import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!, // server-side only
  { auth: { persistSession: false } }
);


// ==============================
// FILE: app/api/games/session/route.ts
// ==============================
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

const REWARDS_ENABLED = process.env.REWARDS_ENABLED === "true";

type Body = {
  gameId: string;
  score: number;
  durationSec: number;
};

function computeTokens(score: number, durationSec: number) {
  // Keep simple & predictable
  const base = Math.floor(score / 100);
  const time = Math.floor(durationSec / 300); // +1 per 5 min
  return Math.max(0, base + time);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  if (!body?.gameId || body.score == null || body.durationSec == null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Auth user (patient)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) Insert session (patient scoped via RLS)
  const { data: sessionRow, error: insertErr } = await supabase
    .from("game_sessions")
    .insert({
      patient_id: user.id,
      game_id: body.gameId,
      score: body.score,
      duration_sec: body.durationSec,
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  // 2) Optional rewards (admin tx)
  let tokens = 0;
  if (REWARDS_ENABLED) {
    tokens = computeTokens(body.score, body.durationSec);
    if (tokens > 0) {
      // single tx
      const { error: txErr } = await supabaseAdmin.rpc("perform_reward_tx", {
        p_patient_id: user.id,
        p_session_id: sessionRow.id,
        p_delta: tokens,
        p_reason: "Game session reward",
      });
      if (txErr) {
        // Not fatal for session; just log
        console.error("Reward tx error:", txErr.message);
      }
    }
  }

  // 3) Return fresh stats
  const { data: stats, error: statsErr } = await supabase
    .from("patient_game_stats_v")
    .select("*")
    .eq("patient_id", user.id)
    .single();

  return NextResponse.json({
    session: sessionRow,
    tokensAwarded: tokens,
    stats: stats ?? null,
  }, { status: statsErr ? 207 : 200 });
}
