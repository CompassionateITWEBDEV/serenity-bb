import { NextRequest, NextResponse } from "next/server";
import { buildZoomAuthUrl, createStateCookie } from "@/lib/zoom";

export async function GET(req: NextRequest) {
  const state = crypto.randomUUID();
  const url = buildZoomAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.headers.append("Set-Cookie", createStateCookie(state));
  return res;
}
