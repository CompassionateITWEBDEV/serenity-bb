import { NextRequest, NextResponse } from "next/server"
import { ensureOverview } from "./store"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get("patientId")
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 })
  const { overview, isNew } = ensureOverview(patientId)
  return NextResponse.json({ overview, isNew })
}
