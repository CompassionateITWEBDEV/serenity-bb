import type { NextRequest } from "next/server";

export function getBearerTokenFromRequest(req: NextRequest | Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (h) {
    const [scheme, token] = h.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) return token.trim();
  }
  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    const token = (req as NextRequest).cookies.get("auth_token")?.value;
    if (token) return token.trim();
  }
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const m = cookie.split(";").map(s => s.trim()).find(s => s.startsWith("auth_token="));
    if (m) return decodeURIComponent(m.slice("auth_token=".length)).trim();
  }
  return null;
}
