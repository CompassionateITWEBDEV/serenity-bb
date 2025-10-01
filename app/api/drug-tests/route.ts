// app/api/drug-tests/route.ts
// Node runtime + dynamic; shows exact server-side auth & staff state on GET.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  patientId: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable(),
});

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", vary: "authorization, cookie", ...extra },
  });
}

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ ok: false, error: "env-missing" }, 500, { "x-debug": "env-missing" });

  const jar = cookies();
  const supaCookie = createServerClient(url, anon, {
    cookies: {
      get: (n) => jar.get(n)?.value,
      set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
      remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
    },
  });

  const cookie = await supaCookie.auth.getUser();
  const authz = req.headers.get("authorization") ?? req.headers.get("Authorization");
  let headerAuth: typeof cookie.data | null = null;
  let path: "cookie" | "header" | "none" = "none";

  if (cookie.data?.user) {
    path = "cookie";
  } else if (authz?.toLowerCase().startsWith("bearer ")) {
    const supaHeader = createSbClient(url, anon, { global: { headers: { Authorization: authz } }, auth: { persistSession: false } });
    const r = await supaHeader.auth.getUser();
    if (r.data?.user) { headerAuth = r.data; path = "header"; }
  }

  const user = cookie.data?.user ?? headerAuth?.user ?? null;

  let staff: any = null;
  if (user) {
    const staffClient = path === "header"
      ? createSbClient(url, anon, { global: { headers: { Authorization: authz! } }, auth: { persistSession: false } })
      : supaCookie;
    const sr = await staffClient.from("staff").select("user_id, active").eq("user_id", user.id).maybeSingle();
    if (!sr.error) staff = sr.data;
  }

  return json(
    { ok: true, path, userId: user?.id ?? null, staff, hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE) },
    200,
    { "x-debug": path }
  );
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase env missing" }, 500, { "x-debug": "env-missing" });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch (e: any) { return json({ error: e?.message ?? "Invalid body" }, 400, { "x-debug": "zod-parse-failed" }); }

  const jar = cookies();
  const supaCookie = createServerClient(url, anon, {
    cookies: {
      get: (n) => jar.get(n)?.value,
      set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
      remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
    },
  });
  const cookieAuth = await supaCookie.auth.getUser();
  const authz = req.headers.get("authorization") ?? req.headers.get("Authorization");

  let headerAuth: typeof cookieAuth.data | null = null;
  if (!cookieAuth.data?.user && authz?.toLowerCase().startsWith("bearer ")) {
    const supaHeader = createSbClient(url, anon, { global: { headers: { Authorization: authz } }, auth: { persistSession: false } });
    const r = await supaHeader.auth.getUser();
    if (r.error) return json({ error: r.error.message }, 401, { "x-debug": "header-getUser-error" });
    headerAuth = r.data;
  }

  const authed = cookieAuth.data?.user ?? headerAuth?.user;
  if (!authed) return json({ error: "Auth session missing!" }, 401, { "x-debug": "no-session" });

  const staffClient =
    headerAuth?.user
      ? createSbClient(url, anon, { global: { headers: { Authorization: authz! } }, auth: { persistSession: false } })
      : supaCookie;

  const staffRes = await staffClient.from("staff").select("user_id, active").eq("user_id", authed.id).maybeSingle();
  if (staffRes.error) return json({ error: staffRes.error.message }, 500, { "x-debug": "staff-query-error" });
  if (!staffRes.data || staffRes.data.active === false) return json({ error: "Forbidden" }, 403, { "x-debug": "not-staff" });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) return json({ error: "Service role key not configured" }, 500, { "x-debug": "service-role-missing" });

  const admin = createSbClient(url, serviceKey, { auth: { persistSession: false } });

  const ins = await admin
    .from("drug_tests")
    .insert({ patient_id: body.patientId, scheduled_for: body.scheduledFor, created_by: authed.id, status: "pending" })
    .select(`id,status,scheduled_for,created_at,patient_id,patients:patient_id(user_id,full_name,first_name,last_name,email)`)
    .single();

  if (ins.error) return json({ error: ins.error.message }, 400, { "x-debug": "insert-error" });

  return json({ data: ins.data }, 200, { "x-debug": "ok" });
}
