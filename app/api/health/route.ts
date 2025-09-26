import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  // Why: minimal file prevents duplicate identifier/import issues
  return NextResponse.json(
    { ok: true, ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
