// middleware.ts  — client-guarded /dashboard (no SSR cookie requirement)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Never touch API or static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Public routes that should never redirect
  const PUBLIC_ROUTES = new Set([
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ]);

  // ✅ Revert: let /dashboard be client-guarded (no SSR auth here)
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.next();
  }

  // For non-dashboard pages you still may want light auth UX:
  const response = NextResponse.next();

  // Optional: only to improve UX on /login → redirect if server cookies exist.
  // Harmless if cookies are missing.
  if (PUBLIC_ROUTES.has(pathname)) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (k) => request.cookies.get(k)?.value,
            set: (k, v, o) => response.cookies.set(k, v, o),
            remove: (k, o) => response.cookies.set(k, "", { ...o, maxAge: 0 }),
          },
        }
      );
      const { data } = await supabase.auth.getUser();
      const isAuthed = !!data?.user;

      if ((pathname === "/login" || pathname === "/signup") && isAuthed) {
        return NextResponse.redirect(new URL("/dashboard", origin));
      }
    } catch {
      // ignore SSR auth errors; keep public routes accessible
    }
    return response;
  }

  // Default: allow everything else
  return response;
}

export const config = {
  // Exclude /api and static from middleware
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts).*)"],
};
