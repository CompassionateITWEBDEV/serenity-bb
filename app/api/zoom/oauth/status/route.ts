import { NextRequest, NextResponse } from "next/server";
import { parseCookieSession, refreshTokensIfNeeded, setSessionCookie } from "@/lib/zoom";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const sess = parseCookieSession(cookieHeader);
  if (!sess.access_token) return NextResponse.json({ connected: false });
  try {
    const { tokens, changed } = await refreshTokensIfNeeded(sess);
    const res = NextResponse.json({ connected: true });
    if (changed) res.headers.append("Set-Cookie", setSessionCookie(tokens));
    return res;
  } catch {
    const res = NextResponse.json({ connected: false });
    res.headers.append("Set-Cookie", "zoom_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax");
    return res;
  }
}
