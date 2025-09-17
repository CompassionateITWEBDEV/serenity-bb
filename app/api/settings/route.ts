import { NextRequest, NextResponse } from "next/server"
import {
  SettingsSchema,
  SettingsPatchSchema,
  type Settings,
} from "@/lib/settings-schema"
import { settingsRepo } from "@/lib/settings-repo"

// Extract user id from header/cookie. In dev, allow a demo user.
function resolveUserId(req: NextRequest): { userId: string; demo: boolean } {
  const auth = req.headers.get("authorization") || ""
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  const fromHeader = req.headers.get("x-user-id") || ""
  const fromCookie = req.cookies.get("userId")?.value || ""
  const userId = bearer || fromHeader || fromCookie || "demo-user-1"
  const demo = userId === "demo-user-1"
  return { userId, demo }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, demo } = resolveUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const settings = await settingsRepo.get(userId)
    const res = NextResponse.json(settings)
    if (demo) res.headers.set("x-demo-user", "true")
    return res
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, demo } = resolveUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 })
    }

    const body = await req.json()
    const parsed = SettingsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const updated = await settingsRepo.update(userId, parsed.data)
    // Final guard: ensure resulting doc still conforms to full schema
    const full = SettingsSchema.parse(updated)
    const res = NextResponse.json(full)
    if (demo) res.headers.set("x-demo-user", "true")
    return res
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export function OPTIONS() {
  // Minimal CORS (adjust as needed for cross-origin)
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
      "Access-Control-Max-Age": "86400",
    },
  })
}
