// /middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Skip assets/api
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Real Supabase session (cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
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

  // Accept your legacy app cookie too, so dashboard loads right after login
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts|api/proxy).*)"],
};
