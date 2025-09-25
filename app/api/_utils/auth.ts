import { createClient, type User } from "@supabase/supabase-js";
import supabaseServer from "@/lib/supabase/server";

function extractBearer(req: Request): string | null {
  const headers = req.headers;
  const candidates = [
    headers.get("authorization"),
    headers.get("Authorization"),
    headers.get("x-authorization"),
    headers.get("X-Authorization"),
    headers.get("x-supabase-authorization"),
    headers.get("X-Supabase-Authorization"),
  ].filter(Boolean) as string[];

  for (const h of candidates) {
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1].trim();
    // some proxies send just the token, handle that too
    if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(h.trim())) return h.trim();
  }
  return null;
}

function extractCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  // common names: sb-access-token OR supabase-auth-token (array json) OR project-scoped keys
  const m1 = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1]);

  const m2 = cookieHeader.match(/(?:^|;\s*)supabase-auth-token=([^;]+)/i);
  if (m2?.[1]) {
    try {
      const arr = JSON.parse(decodeURIComponent(m2[1]));
      // latest token is usually at index 0 or 1 depending on supabase-js version
      const token = Array.isArray(arr) ? (arr[0]?.access_token || arr[1]?.access_token) : null;
      if (token) return token;
    } catch { /* ignore */ }
  }
  return null;
}

export async function getAuthUser(req: Request): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 1) Header token (robust)
  const headerToken = extractBearer(req);
  if (headerToken) {
    try {
      const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${headerToken}` } } });
      const { data, error } = await sb.auth.getUser();
      if (!error && data?.user) return data.user;
    } catch { /* fall through */ }
  }

  // 2) SSR cookie client (same-origin cookie sessions)
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch { /* fall through */ }

  // 3) Raw cookie token fallback
  const cookieToken = extractCookieToken(req);
  if (cookieToken) {
    try {
      const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${cookieToken}` } } });
      const { data, error } = await sb.auth.getUser();
      if (!error && data?.user) return data.user;
    } catch { /* fall through */ }
  }

  return null;
}
export default getAuthUser;
