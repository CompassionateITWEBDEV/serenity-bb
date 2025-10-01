import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

const Body = z.object({
  patientId: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable(),
});

export async function POST(req: Request) {
  // 1) Validate inputs
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch (e: any) { return NextResponse.json({ error: e?.message ?? "Invalid body" }, { status: 400 }); }

  // 2) Get user via cookie-bound *anon* server client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();
  const sb = createServerClient(url, anon, {
    cookies: {
      get: (n) => cookieStore.get(n)?.value,
      set: (n, v, o) => cookieStore.set({ name: n, value: v, ...o }),
      remove: (n, o) => cookieStore.set({ name: n, value: "", ...o, maxAge: 0 }),
    },
  });

  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 3) Check staff.active
  const { data: staffRow, error: staffErr } = await sb
    .from("staff")
    .select("user_id, active")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  if (!staffRow || staffRow.active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) Create with service role (bypasses RLS) so creation works even if client isn’t authed
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });

  const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await admin
    .from("drug_tests")
    .insert({
      patient_id: body.patientId,
      scheduled_for: body.scheduledFor,
      created_by: auth.user.id, // track who created it
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
