// FILE: /lib/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
declare global { var __sb__: SupabaseClient | undefined }
export const supabase =
  globalThis.__sb__ ??
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "src-auth" },
  })
if (process.env.NODE_ENV !== "production") globalThis.__sb__ = supabase

// FILE: /app/(auth)/signup/page.tsx  (core bits)
"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase/client"

export default function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setLoading(true)
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get("email") || "")
    const password = String(fd.get("password") || "")
    const first_name = String(fd.get("first_name") || "")
    const last_name  = String(fd.get("last_name") || "")

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name, last_name } }, // important: trigger reads these
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    // At this point:
    // - auth.users has the user
    // - trigger inserted profiles + health_metrics
    // Redirect or show success message.
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* your inputs ... names: first_name, last_name, email, password */}
      <button disabled={loading} type="submit">{loading ? "Creating..." : "Create account"}</button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  )
}
