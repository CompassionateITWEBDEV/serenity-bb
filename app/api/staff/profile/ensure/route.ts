import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// POST /api/staff/profile/ensure
// Ensures a staff row exists for the current user; creates a minimal profile if missing
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase configuration missing" }, 500);

  // Authenticate user (cookie first, then Bearer)
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: (name: string, value: string, options: any) => {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove: (name: string, options: any) => {
        try { cookieStore.set({ name, value: "", ...options, maxAge: 0 }); } catch {}
      },
    },
  });
  const { data: cookieAuth } = await supabase.auth.getUser();

  let user = cookieAuth?.user;
  if (!user) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
    if (bearer) {
      const supabaseBearer = createSbClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabaseBearer.auth.getUser();
      user = data?.user || null;
    }
  }

  if (!user) return json({ error: "Unauthorized" }, 401);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) return json({ error: "Service role key not configured" }, 500);
  const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Check if staff row already exists
  const { data: existing, error: existErr } = await admin
    .from("staff")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existErr && existErr.code && existErr.message) {
    // Schema/RLS errors: surface but do not crash
    return json({ error: existErr.message, code: existErr.code }, 500);
  }
  if (existing) return json({ created: false, user_id: user.id }, 200);

  // Build minimal profile from auth metadata
  const email = user.email || "";
  const fullName: string = (user.user_metadata?.full_name || user.user_metadata?.name || "").toString();
  const [first_name, last_name] = fullName ? fullName.split(" ", 2) : ["", ""];

  const upsertPayload: any = {
    user_id: user.id,
    email,
    first_name: first_name || null,
    last_name: last_name || null,
    title: null,
    department: null,
    phone: null,
    avatar_url: user.user_metadata?.avatar_url || null,
    active: true,
    role: "staff",
    notification_preferences: {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      submission_alerts: true,
      message_alerts: true,
      appointment_alerts: true,
      emergency_alerts: true,
    },
  };

  const { error: upsertErr } = await admin.from("staff").upsert(upsertPayload, { onConflict: "user_id" });
  if (upsertErr) return json({ error: upsertErr.message, code: upsertErr.code }, 500);

  return json({ created: true, user_id: user.id }, 201);
}


