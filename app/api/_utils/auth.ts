// FILE: app/api/_utils/auth.ts  (server helper – improved)
import { type User } from "@supabase/supabase-js";
import supabaseServer, { supabaseAdmin } from "@/lib/supabase/server";

/** Resolve authenticated user from: SSR cookies OR Authorization: Bearer <token>. */
export async function getAuthUser(req: Request): Promise<User | null> {
  // 1) Try SSR cookies (works if login happened in this domain and cookies are present)
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // ignore – fall through to header
  }

  // 2) Try Authorization header
  const authz = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";

  if (token) {
    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data?.user) return data.user;
  }

  // 3) Optional: try reading an sb-access-token cookie if present (reverse proxy setups)
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (m?.[1]) {
      const admin = supabaseAdmin();
      const { data } = await admin.auth.getUser(decodeURIComponent(m[1]));
      if (data?.user) return data.user;
    }
  } catch {
    // ignore
  }

  return null;
}
