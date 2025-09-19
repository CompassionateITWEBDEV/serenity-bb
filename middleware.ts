// /middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];            // add more as needed
const PUBLIC_PATHS = new Set(["/login", "/signup"]);  // exact matches

function isStaticAsset(pathname: string): boolean {
  // Why: ensure assets never get redirected (defense-in-depth).
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts")
  ) return true;
  return /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname);
}

export function middleware(request: NextRequest) {
  const { nextUrl, method, headers } = request;
  const pathname = nextUrl.pathname;

  // 0) Never touch API, assets, Next internals, or preflight
  if (
    method === "OPTIONS" ||
    pathname.startsWith("/api") ||
    isStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const wantsJson = (headers.get("accept") || "").includes("application/json");

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.has(pathname);

  const authToken =
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("patient_auth")?.value ||
    null;

  // 1) Block unauthenticated access to protected pages
  if (isProtected && !authToken) {
    if (wantsJson) {
      // Why: clients fetching expect JSON, not an HTML redirect.
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname); // optional: preserve return path
    return NextResponse.redirect(url);
  }

  // 2) Redirect authenticated users away from public pages
  if (isPublic && authToken) {
    const url = nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on everything except api/static/etc. Matcher kept, but we also guard in code.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)).*)",
  ],
};
