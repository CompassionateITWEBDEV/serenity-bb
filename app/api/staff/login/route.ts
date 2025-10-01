import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { email: string; password: string };

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase env missing" }, 500, { "x-debug": "env-missing" });

  let body: Body;
  try {
    body = (await req.json()) as Body;
    if (!body?.email || !body?.password) return json({ error: "Missing credentials" }, 400);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const jar = cookies();
  const supaSSR = createServerClient(url, anon, {
    cookies: {
      get: (n) => jar.get(n)?.value,
      set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
      remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
    },
  });

  // Sign in (SSR adapter writes auth cookies)
  const r = await supaSSR.auth.signInWithPassword({ email: body.email, password: body.password });
  if (r.error || !r.data?.user || !r.data?.session) {
    return json({ error: r.error?.message ?? "Invalid credentials" }, 401, { "x-debug": "signin-failed" });
  }
  const { user, session } = r.data;

  // Staff check (DB preferred; fallback to metadata)
  let isStaff = false;
  const supaHeader = createSbClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const staffRes = await supaHeader.from("staff").select("user_id,active").eq("user_id", user.id).maybeSingle();
  if (!staffRes.error && staffRes.data?.active === true) {
    isStaff = true;
  } else {
    const role =
      (user.app_metadata as any)?.role ??
      (user.user_metadata as any)?.role ??
      null;
    if (role === "staff") isStaff = true;
  }
  if (!isStaff) {
    try { await supaSSR.auth.signOut(); } catch {}
    return json({ error: "Not authorized as staff" }, 403, { "x-debug": "not-staff" });
  }

  return json(
    {
      ok: true,
      user: { id: user.id, email: user.email },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
    },
    200,
    { "x-debug": "ok" }
  );
}
