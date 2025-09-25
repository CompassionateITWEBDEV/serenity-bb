import { type User } from "@supabase/supabase-js";
import supabaseServer, { supabaseAdmin } from "@/lib/supabase/server";

export async function getAuthUser(req: Request): Promise<User | null> {
  // 1) Try SSR cookies
  const sb = supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (!error && data?.user) return data.user;

  // 2) Fallback to Authorization: Bearer <token>
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authz?.toLowerCase().startsWith("bearer ")
    ? authz.slice(7).trim()
    : null;

  if (!token) return null;

  const admin = supabaseAdmin();
  const { data: byToken } = await admin.auth.getUser(token);
  return byToken?.user ?? null;
}
