import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function sb(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return createServerClient(url, anon, {
    cookies: {
      get: (k) => cookies().get(k)?.value,
      set: (k, v, o?: CookieOptions) => cookies().set(k, v, o),
      remove: (k, o?: CookieOptions) => cookies().set(k, "", { ...o, maxAge: 0 }),
    },
    global: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined,
  });
}
export async function requireUser(req: Request) {
  const supabase = sb(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { supabase, user: null as any };
  return { supabase, user: data.user };
}
export function ok(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export function bad(msg: string, status = 400) {
  return ok({ error: msg }, status);
}
