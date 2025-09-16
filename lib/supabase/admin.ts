import "server-only"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
type Db = unknown

const pick = (...keys: string[]) => keys.map(k => process.env[k]).find(Boolean)

export function getSbAdmin(): SupabaseClient<Db> {
  const url = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
  const key = pick("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE")
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  return createClient<Db>(url!, key!)
}
