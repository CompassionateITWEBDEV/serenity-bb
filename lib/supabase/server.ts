// ============================================================================
// File: /lib/supabase/server.ts
// SSR Supabase client (cookies) + Admin (service role)
// ============================================================================

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";

// Replace with your generated Database type if available
type Db = unknown;

/**
 * SSR client bound to Next.js cookies.
 * Safe to use in Route Handlers and Server Components.
 */
export default function supabaseServer(): SupabaseClient<Db> {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createServerClient<Db>(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // why: in Server Components set/remove can throw; swallow safely
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch { /* no-op on read-only cookies context */ }
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch { /* no-op on read-only cookies context */ }
      },
    },
  });
}

/**
 * Service-role admin client (singleton).
 * WARNING: Server-only. Never import in client components.
 */
let _admin: SupabaseClient<Db> | null = null;

export function supabaseAdmin(): SupabaseClient<Db> {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both common env names
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    "";

  if (!url || !key) {
    throw new Error("Missing SUPABASE service role env (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE).");
  }

  _admin = createSbClient<Db>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _admin;
}

/** Optional: quick sanity check for deployment diagnostics. */
export function assertServerEnv(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  if (
    !(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE
    )
  ) {
    // not fatal unless you call supabaseAdmin()
    console.warn("[supabase] Service role key not configured – admin client will fail.");
  }
}

// No confusing aliases like `createClient = supabaseAdmin`; keep exports explicit.
// default export: supabaseServer
// named export: supabaseAdmin
