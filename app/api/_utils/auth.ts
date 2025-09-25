import { type User } from "@supabase/supabase-js";
import supabaseServer, { supabaseAdmin } from "@/lib/supabase/server";

/** Resolve authenticated user from SSR cookies, Authorization header, or sb-access-token cookie. */
export async function getAuthUser(req: Request): Promise<User | null> {
  // 1) SSR cookies (works when the session cookies are present on this domain)
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // fall through
  }

  // 2) Authorization: Bearer <access_token>
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1]?.trim();
    if (token) {
      const admin = supabaseAdmin();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) return data.user;
    }
  } catch {
    // fall through
  }

  // 3) Cookie fallback: sb-access-token=<token>
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/i);
    const token = m?.[1] ? decodeURIComponent(m[1]) : undefined;
    if (token) {
      const admin = supabaseAdmin();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) return data.user;
    }
  } catch {
    // fall through
  }

  return null;
}
export default getAuthUser;
