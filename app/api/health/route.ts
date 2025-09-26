import { NextResponse as NR } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET() {
  return NR.json({ ok: true, ts: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
