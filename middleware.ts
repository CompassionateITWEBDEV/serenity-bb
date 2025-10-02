// path: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "patient" | "staff" | "admin" | null;

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Skip APIs/assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Public pages (no SSR redirects)
  const PUBLIC = new Set<string>([
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/staff/login",
  ]);

  // Dashboards are client-guarded
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/patient/dashboard" ||
    pathname.startsWith("/patient/dashboard/") ||
    pathname === "/staff/dashboard" ||
    pathname.startsWith("/staff/dashboard/")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (PUBLIC.has(pathname)) {
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

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) return response; // unauth: keep user on the chosen login page

      // Try to read role; do not force redirects on failure.
      let role: Role = null;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = (profile?.role as Role) ?? null;
      } catch {
        role = null;
      }

      // Precise redirects (avoid sending unknown-role users away from /staff/login).
      if (pathname === "/login") {
        if (role === "patient") {
          return NextResponse.redirect(new URL("/patient/dashboard", origin));
        }
        if (role === "staff" || role === "admin") {
          return NextResponse.redirect(new URL("/staff/dashboard", origin));
        }
        return response; // unknown role stays
      }

      if (pathname === "/staff/login") {
        if (role === "staff" || role === "admin") {
          return NextResponse.redirect(new URL("/staff/dashboard", origin));
        }
        if (role === "patient") {
          return NextResponse.redirect(new URL("/patient/dashboard", origin));
        }
        return response; // unknown role stays to sign in as staff
      }
    } catch {
      // Fail-open for public pages
      return response;
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts).*)",
  ],
};
