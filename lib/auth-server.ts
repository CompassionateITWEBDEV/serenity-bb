import type { NextRequest } from "next/server";

/** Extract bearer token from Authorization header ("Bearer <token>") or 'auth_token' cookie. */
export function getBearerTokenFromRequest(req: NextRequest | Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) return token.trim();
  }
  // Only NextRequest provides cookies; guard for plain Request.
  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    const token = (req as NextRequest).cookies.get("auth_token")?.value;
    if (token) return token.trim();
  }
  return null;
}

/** Strict variant that throws 401 when missing. */
export function requireAuthToken(req: NextRequest | Request): string {
  const token = getBearerTokenFromRequest(req);
  if (!token) {
    const e = new Error("Unauthorized") as Error & { status?: number };
    e.status = 401;
    throw e;
  }
  return token;
}
