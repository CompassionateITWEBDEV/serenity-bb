import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";

// Tip: replace `unknown` with your generated Database type if available.
type Db = unknown;

/** Default server-bound client (cookie-based auth) */
export default function supabaseServer(): SupabaseClient<Db> {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createServerClient<Db>(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* edge strict mode: ignore */
        }
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          /* ignore */
        }
      },
    },
    db: { schema: "public" },
  });
}

/** Named export expected by your route handlers */
export function getServerSupabase(): SupabaseClient<Db> {
  return supabaseServer();
}

/** Create a client bound to a bearer token (e.g. webhooks, server fetch with user JWT) */
export function supabaseForToken(token?: string | null): SupabaseClient<Db> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createSbClient<Db>(url, anon, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Realtime-enabled client bound to a user/service JWT.
 * Use this in API routes to subscribe to `postgres_changes` with the caller's RLS.
 * Example:
 *   const { data: { session } } = await getServerSupabase().auth.getSession();
 *   const rt = supabaseRealtimeForToken(session!.access_token);
 *   const ch = rt.channel(`conv_${id}`).on(...).subscribe();
 */
export function supabaseRealtimeForToken(token: string): SupabaseClient<Db> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createSbClient<Db>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }, // server usage
    realtime: {
      params: { eventsPerSecond: "2" }, // throttle; tweak if needed
    },
  });
}

let _admin: SupabaseClient<Db> | null = null;
/** Service-role client (bypasses RLS). Use server-only. */
export function supabaseAdmin(): SupabaseClient<Db> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? "";
  if (!url || !key)
    throw new Error("Missing service role env (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE).");
  _admin = createSbClient<Db>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

/** Assert envs early in server boot paths */
export function assertServerEnv(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)) {
    console.warn("[supabase] Service role key not configured – admin client will fail if used.");
  }
}

/** Aliases kept for compatibility with your other imports */
export const createClient = supabaseServer;
export const createServiceRoleClient = supabaseAdmin;

// Convenience alias if you prefer the previous name in examples
export const createRealtimeWithJwt = supabaseRealtimeForToken;

export type { SupabaseClient } from "@supabase/supabase-js";

/** NEW: tiny helper to read Bearer token; avoids duplicate code across routes */
export function getBearerFromRequest(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}
