// ============================================================================
// FILE: lib/supabase/server.ts
// SSR Supabase client (cookies) + Admin (service role) + Token-bound client
// ============================================================================

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";

// Replace with your generated Database type if available
type Db = unknown;

/** SSR client bound to Next.js cookies. */
export default function supabaseServer(): SupabaseClient<Db> {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createServerClient<Db>(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // why: Next Server Components can throw on set/remove; ignore.
      set: (name: string, value: string, options: CookieOptions) => {
        try { cookieStore.set({ name, value, ...options }); } catch { /* no-op */ }
      },
      remove: (name: string, options: CookieOptions) => {
        try { cookieStore.set({ name, value: "", ...options, maxAge: 0 }); } catch { /* no-op */ }
      },
    },
  });
}

/**
 * Token-bound client for Route Handlers using Authorization: Bearer <token>.
 * Keeps RLS user context without relying on cookies.
 */
export function supabaseForToken(token?: string | null): SupabaseClient<Db> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createSbClient<Db>(url, anon, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false }, // why: server-side
  });
}

/** Service-role admin client (singleton). Server-only. */
let _admin: SupabaseClient<Db> | null = null;
export function supabaseAdmin(): SupabaseClient<Db> {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? "";
  if (!url || !key) {
    throw new Error("Missing service role env (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE).");
  }

  _admin = createSbClient<Db>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/** Optional sanity check for deployment diagnostics. */
export function assertServerEnv(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)) {
    console.warn("[supabase] Service role key not configured – admin client will fail if used.");
  }
}

/* ----------------------------------------------------------------------------
 * Compat aliases (keeps existing imports working):
 *   import { createClient } from "@/lib/supabase/server"            // SSR client
 *   import { createServiceRoleClient } from "@/lib/supabase/server" // Admin
 *   import { supabaseForToken } from "@/lib/supabase/server"        // Token client
 * -------------------------------------------------------------------------- */
export const createClient = supabaseServer;
export const createServiceRoleClient = supabaseAdmin;
// (Named export already provided above): supabaseForToken
export type { SupabaseClient } from "@supabase/supabase-js";
