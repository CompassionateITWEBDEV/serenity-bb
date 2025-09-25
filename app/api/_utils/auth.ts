import { createClient, type User } from "@supabase/supabase-js";

function extractBearer(req: Request): string | null {
  const H = req.headers;
  const cands = [
    H.get("authorization"), H.get("Authorization"),
    H.get("x-authorization"), H.get("X-Authorization"),
    H.get("x-supabase-authorization"), H.get("X-Supabase-Authorization"),
  ].filter(Boolean) as string[];
  for (const h of cands) {
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1].trim();
    if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(h.trim())) return h.trim();
  }
  return null;
}

function extractCookieToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m1 = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1]);
  const m2 = cookie.match(/(?:^|;\s*)supabase-auth-token=([^;]+)/i);
  if (m2?.[1]) {
    try {
      const arr = JSON.parse(decodeURIComponent(m2[1]));
      const t = Array.isArray(arr) ? (arr[0]?.access_token || arr[1]?.access_token) : null;
      if (t) return t;
    } catch {}
  }
  return null;
}

export async function getAuthUser(req: Request): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = extractBearer(req) ?? extractCookieToken(req);
  if (!token) return null;

  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
export default getAuthUser;
