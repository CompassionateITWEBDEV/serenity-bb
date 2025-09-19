// ============================================================================
// File: /lib/supabase/server.ts
// Why: Provide SSR client (cookies) + admin client. Fixes "not exported" error.
// ============================================================================
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";

type Db = unknown; // replace with your generated Database type if available

// SSR client bound to Next.js cookies (safe for Route Handlers/Server Components)
export function supabaseServer(): SupabaseClient<Db> {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");

  return createServerClient<Db>(url, anon, {
    cookies: {
      // keep auth session in sync between server <-> client
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        cookieStore.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

// Admin (Service Role). WARNING: Do not import this in client code.
let _admin: SupabaseClient<Db> | null = null;
export function supabaseAdmin(): SupabaseClient<Db> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env variables");
  _admin = createSbClient<Db>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }, // no cookies
  });
  return _admin;
}

// Back-compat aliases (keep your existing imports working)
export const createServiceRoleClient = supabaseAdmin;
export const getSbAdmin = supabaseAdmin;
export const createClient = supabaseAdmin;

// Allow both default and named imports
export default supabaseServer;
