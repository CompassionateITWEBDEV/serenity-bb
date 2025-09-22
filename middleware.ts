// path: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Hard skip for API and static
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Why: keep env names consistent across app (route.ts uses NEXT_PUBLIC_*)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // <- unify, or define both envs with same value
    {
      cookies: {
        get: (k) => request.cookies.get(k)?.value,
        set: (k, v, o) => response.cookies.set(k, v, o),
        remove: (k, o) => response.cookies.set(k, "", { ...o, maxAge: 0 }),
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const hasSupabase = !!data?.user;

  // Accept legacy cookie if present
  const hasAppCookie =
    !!(request.cookies.get("auth_token")?.value || request.cookies.get("patient_auth")?.value);

  const isAuthed = hasSupabase || hasAppCookie;

  const isProtected = pathname.startsWith("/dashboard");
  const isPublic = pathname === "/login" || pathname === "/signup";

  if (isProtected && !isAuthed) {
    const wantsJson = (request.headers.get("accept") || "").includes("application/json");
    if (wantsJson) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = new URL("/login", origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isPublic && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return response;
}

// Why: exclude /api entirely to prevent middleware from ever running on API routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts).*)"],
};
