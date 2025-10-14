import { NextRequest, NextResponse } from "next/server";
import {
  parseCookieSession,
  isExpired,
  refreshTokensIfNeeded,
  setSessionCookie,
} from "@/lib/zoho";

export async function GET(req: NextRequest) {
  const cookies = req.headers.get("cookie") || "";
  const sess = parseCookieSession(cookies);
  if (!sess.access_token) {
    return NextResponse.json({ connected: false });
  }
  try {
    const { tokens, changed } = await refreshTokensIfNeeded(sess);
    const res = NextResponse.json({ connected: true });
    if (changed) res.headers.append("Set-Cookie", setSessionCookie(tokens));
    return res;
  } catch {
    // On refresh failure, wipe
    const res = NextResponse.json({ connected: false });
    res.headers.append(
      "Set-Cookie",
      "zoho_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax"
    );
    return res;
  }
}
