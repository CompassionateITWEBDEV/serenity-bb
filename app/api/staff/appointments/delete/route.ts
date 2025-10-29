import { NextRequest, NextResponse } from "next/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json().catch(() => ({ id: null }));
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Authenticate requester and ensure they are staff/admin
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();
    
    // Bearer token fallback if no cookie session
    if (!user) {
      const urlHdr = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
      if (urlHdr && anon && bearer) {
        const bearerClient = createSbClient(urlHdr, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await bearerClient.auth.getUser();
        user = data?.user ?? null;
      }
    }

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = user.user_metadata?.role;

    // If metadata role is missing, verify staff via public.staff table
    if (role !== "staff" && role !== "admin") {
      try {
        const checkSb = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: staffRow } = await checkSb
          .from("staff")
          .select("user_id, active")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!staffRow || staffRow.active !== true) {
          return NextResponse.json({ error: "Forbidden", code: "NOT_STAFF" }, { status: 403 });
        }
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Forbidden", code: "STAFF_CHECK_FAILED" }, { status: 403 });
      }
    }

    const sb = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Ensure appointment exists and is cancelled
    const { data: appt, error: fetchErr } = await sb
      .from("appointments")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message, code: fetchErr.code || "FETCH_ERR" }, { status: 500 });
    if (!appt) return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    if (String(appt.status).toLowerCase() !== "cancelled") {
      return NextResponse.json({ error: "Only cancelled appointments can be deleted", code: "NOT_CANCELLED" }, { status: 400 });
    }

    const { error: delErr } = await sb.from("appointments").delete().eq("id", id);
    if (delErr) return NextResponse.json({ error: delErr.message, code: delErr.code || "DELETE_ERR" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error", code: "EXCEPTION" }, { status: 500 });
  }
}


