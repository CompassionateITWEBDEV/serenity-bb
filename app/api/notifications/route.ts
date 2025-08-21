// app/api/notifications/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// Optional: clamp helpers
const toInt = (v: string | null, d = 20) => {
  const n = v ? parseInt(v, 10) : d
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : d
}

export async function GET(req: Request) {
  try {
    // Read auth session from cookies (Next.js 13+ route handlers)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},  // no-ops here; Next handles cookies
          remove: () => {},
        },
      }
    )

    const url = new URL(req.url)
    const limit = toInt(url.searchParams.get("limit"), 20)
    const onlyUnread = url.searchParams.get("only") === "unread"
    const since = url.searchParams.get("since") // ISO date string, optional

    // Who is the user?
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // With proper RLS policies (see SQL below), we can query notifications directly
    let query = supabase
      .from("notifications")
      .select("id,type,title,message,read,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit)

    if (onlyUnread) query = query.eq("read", false)
    if (since) query = query.gte("created_at", since)

    const { data, error } = await query
    if (error) {
      console.error("Error fetching notifications:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, notifications: data ?? [] }, { status: 200 })
  } catch (err: any) {
    console.error("Unexpected notifications error:", err)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
