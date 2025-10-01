import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supaEnvOk = Boolean(URL && ANON);

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_BROWSER__: SupabaseClient | undefined;
}

function makeBrowserClient(): SupabaseClient {
  if (!supaEnvOk) {
    // @ts-expect-error placeholder; real calls will 401
    return createClient("http://localhost", "anon", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      db: { schema: "public" },
    });
  }
  return createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    db: { schema: "public" },
  });
}

// ✅ HMR-safe singleton
export const supabase: SupabaseClient =
  globalThis.__SUPABASE_BROWSER__ ?? (globalThis.__SUPABASE_BROWSER__ = makeBrowserClient());

export async function getAuthSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}
export async function getAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}
export async function getAccessToken(): Promise<string | null> {
  const s = await getAuthSession();
  return s?.access_token ?? null;
}
