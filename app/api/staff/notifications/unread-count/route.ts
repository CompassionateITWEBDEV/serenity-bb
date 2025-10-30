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

// GET /api/staff/notifications/unread-count
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase configuration missing" }, 500);

  try {
    // Authenticate as staff
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

    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    let user = cookieAuth?.user;
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
      if (bearer) {
        const supabaseBearer = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerAuth } = await supabaseBearer.auth.getUser();
        user = bearerAuth?.user;
      }
    }

    if (!user) return json({ error: "Unauthorized" }, 401);

    // Count using service role to bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const db = serviceKey
      ? createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : supabase;

    const { count, error } = await db
      .from("staff_notifications")
      .select("*", { count: "exact", head: true })
      .eq("staff_id", user.id)
      .eq("read", false);

    if (error) {
      // Return 200 with 0 on schema/RLS issues to avoid UI spam
      return json({ count: 0, warning: error.message }, 200);
    }

    return json({ count: count ?? 0 }, 200);
  } catch (e: any) {
    return json({ count: 0, error: e?.message || "Internal error" }, 200);
  }
}


