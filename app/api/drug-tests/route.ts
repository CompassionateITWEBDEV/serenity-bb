import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  patientId: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable(),
});

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase env missing" }, 500, { "x-debug": "env-missing" });

  // Validate body
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return json({ error: e?.message ?? "Invalid body" }, 400, { "x-debug": "zod-parse-failed" });
  }

  try {
    // 1) Try cookie-bound anon client
    const jar = cookies();
    const supaCookie = createServerClient(url, anon, {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
        remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
      },
    });
    let { data: cookieAuth, error: cookieErr } = await supaCookie.auth.getUser();
    if (cookieErr) return json({ error: cookieErr.message }, 500, { "x-debug": "cookie-getUser-error" });

    // 2) If cookie missing, try Authorization bearer header
    const bearer = req.headers.get("authorization"); // "Bearer <jwt>"
    let headerAuth: typeof cookieAuth | null = null;
    if (!cookieAuth?.user && bearer?.startsWith("Bearer ")) {
      const supaHeader = createSbClient(url, anon, {
        global: { headers: { Authorization: bearer } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const r = await supaHeader.auth.getUser();
      if (r.error) return json({ error: r.error.message }, 401, { "x-debug": "header-getUser-error" });
      headerAuth = r.data;
    }

    const authed = cookieAuth?.user ?? headerAuth?.user;
    if (!authed) return json({ error: "Auth session missing!" }, 401, { "x-debug": "no-session" });

    // 3) Staff check using the same style of client that worked
    const staffClient =
      headerAuth?.user
        ? createSbClient(url, anon, {
            global: { headers: { Authorization: bearer! } },
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : supaCookie;

    const { data: staffRow, error: staffErr } = await staffClient
      .from("staff")
      .select("user_id, active")
      .eq("user_id", authed.id)
      .maybeSingle();

    if (staffErr) return json({ error: staffErr.message }, 500, { "x-debug": "staff-query-error" });
    if (!staffRow || staffRow.active === false) return json({ error: "Forbidden" }, 403, { "x-debug": "not-staff" });

    // 4) Insert via service role
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey) return json({ error: "Service role key not configured" }, 500, { "x-debug": "service-role-missing" });

    const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data, error } = await admin
      .from("drug_tests")
      .insert({
        patient_id: body.patientId,
        scheduled_for: body.scheduledFor,
        created_by: authed.id,
        status: "pending",
      })
      .select(
        `id, status, scheduled_for, created_at, patient_id,
         patients:patient_id ( user_id, full_name, first_name, last_name, email )`
      )
      .single();

    if (error) return json({ error: error.message }, 400, { "x-debug": "insert-error" });

    return json({ data }, 200, { "x-debug": "ok" });
  } catch (e: any) {
    // Never throw raw – always respond JSON with debug
    return json({ error: e?.message ?? "Unexpected error" }, 500, { "x-debug": "unhandled" });
  }
}
