// path: lib/supabase/browser.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Why: explicit guard so UI can still mount if envs misconfigured.
export const supaEnvOk = Boolean(url && key);

export const supabase = createClient(url ?? "http://localhost", key ?? "anon", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
