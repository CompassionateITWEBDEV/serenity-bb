import { createServerClient as _createServerClient } from "@supabase/ssr"; // rename import to avoid shadowing
import { createClient as createSbClient2 } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";

const Body = z.object({
  patientId: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable(),
});

function j(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", vary: "authorization, cookie", ...extra },
  });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return j({ error: "Supabase env missing" }, 500, { "x-debug": "env-missing" });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch (e: any) { return j({ error: e?.message ?? "Invalid body" }, 400, { "x-debug": "zod-parse-failed" }); }

  const jar = cookies();
  const supaCookie = _createServerClient(url, anon, {
    cookies: {
      get: (n) => jar.get(n)?.value,
      set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
      remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
    },
    db: { schema: "public" },
  });

  const cookieAuth = await supaCookie.auth.getUser();
  if (cookieAuth.error) return j({ error: cookieAuth.error.message }, 500, { "x-debug": "cookie-getUser-error" });

  const authz = req.headers.get("authorization") ?? req.headers.get("Authorization");
  let headerAuth: typeof cookieAuth.data | null = null;
  if (!cookieAuth.data?.user && authz?.toLowerCase().startsWith("bearer ")) {
    const supaHeader = createSbClient2(url, anon, {
      global: { headers: { Authorization: authz } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const r = await supaHeader.auth.getUser();
    if (r.error) return j({ error: r.error.message }, 401, { "x-debug": "header-getUser-error" });
    headerAuth = r.data;
  }

  const authed = cookieAuth.data?.user ?? headerAuth?.user;
  if (!authed) return j({ error: "Auth session missing!" }, 401, { "x-debug": "no-session" });

  const staffClient =
    headerAuth?.user
      ? createSbClient2(url, anon, {
          global: { headers: { Authorization: authz! } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : supaCookie;

  const staffRes = await staffClient.from("staff").select("user_id,active").eq("user_id", authed.id).maybeSingle();
  if (staffRes.error) return j({ error: staffRes.error.message }, 500, { "x-debug": "staff-query-error" });
  if (!staffRes.data || staffRes.data.active === false) return j({ error: "Forbidden" }, 403, { "x-debug": "not-staff" });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) return j({ error: "Service role key not configured" }, 500, { "x-debug": "service-role-missing" });

  const admin = createSbClient2(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const ins = await admin
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

  if (ins.error) return j({ error: ins.error.message }, 400, { "x-debug": "insert-error" });
  return j({ data: ins.data }, 200, { "x-debug": "ok" });
}
