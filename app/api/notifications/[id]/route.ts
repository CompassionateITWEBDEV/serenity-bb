// app/api/notifications/[id]/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set(){}, remove(){} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", params.id)
    .select("id,read")
    .maybeSingle()

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 400 })
  return NextResponse.json({ ok: true, notification: data })
}
