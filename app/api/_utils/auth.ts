import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import supabaseServer from "@/lib/supabase/server";

// Why: In many prod envs the service role key isn't set. This validates Bearer using anon client.
export async function getAuthUser(req: Request): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 1) Try Authorization: Bearer <token>
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const accessToken = m?.[1]?.trim();

  if (accessToken) {
    try {
      const sb = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data, error } = await sb.auth.getUser();
      if (!error && data?.user) return data.user;
    } catch {
      // fall through
    }
  }

  // 2) Fallback: SSR cookies (works if you use set/get cookies strategy)
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // ignore
  }

  return null;
}
export default getAuthUser;
