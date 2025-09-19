import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // skip assets/api/next internals early
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => request.cookies.get(key)?.value,
        set: (key, value, options) => response.cookies.set(key, value, options),
        remove: (key, options) => response.cookies.set(key, "", { ...options, maxAge: 0 }),
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const isAuthed = !!data?.user;

  const isProtected = pathname.startsWith("/dashboard");
  const isPublic = pathname === "/login" || pathname === "/signup";

  // protect dashboard routes
  if (isProtected && !isAuthed) {
    // honor JSON clients (e.g., fetch) by returning 401 instead of HTML redirect
    const wantsJson = (request.headers.get("accept") || "").includes("application/json");
    if (wantsJson) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = new URL("/login", origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // if already signed in, keep them out of login/signup
  if (isPublic && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts|api/proxy).*)"],
};
