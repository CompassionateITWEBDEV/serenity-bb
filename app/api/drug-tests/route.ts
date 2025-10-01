import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  patientId: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable(),
});

export async function POST(req: Request) {
  // validate
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch (e: any) { return NextResponse.json({ error: e?.message ?? "Invalid body" }, { status: 400 }); }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });

  // 1) Try cookie-based session
  const jar = cookies();
  const supaCookies = createServerClient(url, anon, {
    cookies: {
      get: (n) => jar.get(n)?.value,
      set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
      remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
    },
  });
  let { data: auth, error: authErr } = await supaCookies.auth.getUser();

  // 2) If no cookie session, try Authorization bearer from client
  if (!auth?.user) {
    const bearer = req.headers.get("authorization"); // "Bearer <jwt>"
    if (bearer?.startsWith("Bearer ")) {
      const supaHeader = createSbClient(url, anon, {
        global: { headers: { Authorization: bearer } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const r = await supaHeader.auth.getUser();
      auth = r.data;
      authErr = r.error ?? null;
    }
  }

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
  if (!auth?.user) return NextResponse.json({ error: "Auth session missing!" }, { status: 401 });

  // staff gate
  const supaReader = createSbClient(url, anon, {
    global: auth.user ? { headers: { Authorization: `Bearer ${req.headers.get("authorization")?.replace(/^Bearer\s+/,'') ?? ""}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: staffRow, error: staffErr } = await supaReader
    .from("staff").select("user_id,active").eq("user_id", auth.user.id).maybeSingle();
  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  if (!staffRow || staffRow.active === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // write using service-role (bypass RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });

  const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await admin
    .from("drug_tests")
    .insert({
      patient_id: body.patientId,
      scheduled_for: body.scheduledFor,
      created_by: auth.user.id,
      status: "pending",
    })
    .select(
      `id, status, scheduled_for, created_at, patient_id,
       patients:patient_id ( user_id, full_name, first_name, last_name, email )`
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
