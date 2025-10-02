import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supaEnvOk: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Cache in global for HMR
declare global { var __SUPABASE_BROWSER__: SupabaseClient | undefined; }

export function createSupabaseBrowser(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // dev placeholder so UI can mount
    // @ts-expect-error dev placeholder
    return createClient("http://localhost", "anon", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      db: { schema: "public" },
    });
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    db: { schema: "public" },
    global: process.env.NEXT_PUBLIC_SUPABASE_DEBUG ? { headers: { "x-supabase-debug": "1" } } : undefined,
  });
}

export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = createSupabaseBrowser());

export function requireSupabaseEnv(): asserts supaEnvOk is true {
  if (!supaEnvOk) throw new Error("Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.");
}

// ---- helpers kept for drug-tests and auth ----
export async function getAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn("supabase.auth.getSession:", error.message);
  return data?.session ?? null;
}

export async function getAuthUser(): Promise/User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.warn("supabase.auth.getUser:", error.message);
  return data?.user ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.access_token ?? null;
}

// Role helper used by patient flow
export type AppRole = "patient" | "staff" | "admin";
export async function getUserRole(client: SupabaseClient = supabase): Promise<AppRole | null> {
  const { data: auth } = await client.auth.getUser();
  const id = auth.user?.id;
  if (!id) return null;
  const { data, error } = await client.from("profiles").select("role").eq("id", id).maybeSingle();
  if (error) { console.warn("profiles.role:", error.message); return null; }
  return (data?.role as AppRole | undefined) ?? null;
}
