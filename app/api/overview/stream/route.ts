// ============================================================================
// File: app/api/overview/stream/route.ts  (FORCE NODE RUNTIME + DYNAMIC)
// ============================================================================
export const runtime = "nodejs"         // Why: SSE stability on Vercel/Node
export const dynamic = "force-dynamic"  // Why: never pre-render/cache this route

import { NextResponse } from "next/server"
import { ensureOverview, subscribe, type Overview } from "../store"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get("patientId")
  if (!patientId) return new NextResponse("patientId required", { status: 400 })

  const { overview, isNew } = ensureOverview(patientId)

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (type: string, payload: unknown) =>
        controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`))

      send("overview", { overview, isNew })
      const unsub = subscribe(patientId, (ov: Overview) => send("overview", { overview: ov, isNew: false }))
      const ka = setInterval(() => send("ping", Date.now()), 25_000)

      controller.oncancel = () => {
        unsub()
        clearInterval(ka)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
