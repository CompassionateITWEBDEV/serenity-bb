// path: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "patient" | "staff" | "admin" | null;

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // Always create a response we can mutate (so refreshed cookies are set)
  const res = NextResponse.next();

  // ⚠️ DO NOT skip /api — API needs refreshed auth cookies
  // Skip only static assets and Next internals
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml|woff2?)$/.test(pathname);

  if (isStatic) return res;

  // Always touch the session to refresh cookies when needed
  // (critical for API routes and any SSR/edge paths)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );
  await supabase.auth.getSession();

  // Public pages (no SSR hard-block; we may redirect if user already authed)
  const PUBLIC = new Set<string>([
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/staff/login",
  ]);

  // Dashboards are client-guarded; let them pass
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/patient/dashboard" ||
    pathname.startsWith("/patient/dashboard/") ||
    pathname === "/staff/dashboard" ||
    pathname.startsWith("/staff/dashboard/")
  ) {
    return res;
  }

  if (PUBLIC.has(pathname)) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return res;

      // Try to read role; fail-open on any error
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

      if (pathname === "/login") {
        if (role === "patient") return NextResponse.redirect(new URL("/patient/dashboard", origin));
        if (role === "staff" || role === "admin")
          return NextResponse.redirect(new URL("/staff/dashboard", origin));
        return res;
      }

      if (pathname === "/staff/login") {
        if (role === "staff" || role === "admin")
          return NextResponse.redirect(new URL("/staff/dashboard", origin));
        if (role === "patient") return NextResponse.redirect(new URL("/patient/dashboard", origin));
        return res;
      }
    } catch {
      // Fail-open for public pages
      return res;
    }
  }

  return res;
}

// Include API so cookies refresh for route handlers
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|images|fonts).*)",
  ],
};
