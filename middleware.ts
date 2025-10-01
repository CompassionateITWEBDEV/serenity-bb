// File: /middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function assetsOrApi(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml|woff2?|ttf|otf)$/.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // 0) Always skip assets/API
  if (assetsOrApi(pathname) || request.method === "OPTIONS") {
    return NextResponse.next();
  }

  // 1) Public routes (never block)
  const PUBLIC = new Set<string>([
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/staff/login",        // allow staff login page
  ]);

  // 2) Client-guarded app dashboard (per your comment)
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.next();
  }

  // 3) Determine if we should server-guard this path
  const requiresServerAuth =
    pathname.startsWith("/staff") || pathname.startsWith("/clinician");

  // If not a protected area, pass through (with small UX nicety on /login)
  const response = NextResponse.next();

  // Early exit for non-protected paths except login UX improvement below
  if (!requiresServerAuth) {
    if (PUBLIC.has(pathname)) {
      // Optional: redirect away from /login|/signup if already authed
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        if (!url || !anon) return response; // soft fail if envs missing

        const supabase = createServerClient(url, anon, {
          cookies: {
            get: (k: string) => request.cookies.get(k)?.value,
            set: (k: string, v: string, o: CookieOptions) => response.cookies.set({ name: k, value: v, ...o }),
            remove: (k: string, o: CookieOptions) => response.cookies.set({ name: k, value: "", ...o, maxAge: 0 }),
          },
        });
        const { data } = await supabase.auth.getUser();
        const authed = !!data?.user;
        if ((pathname === "/login" || pathname === "/signup") && authed) {
          return NextResponse.redirect(new URL("/staff/dashboard", origin));
        }
      } catch {
        // ignore auth errors; keep public accessible
      }
    }
    return response;
  }

  // 4) Protected server-guarded areas (/staff/**, /clinician/**)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) return NextResponse.next(); // soft allow if envs missing

    const res = NextResponse.next();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (k: string) => request.cookies.get(k)?.value,
        set: (k: string, v: string, o: CookieOptions) => res.cookies.set({ name: k, value: v, ...o }),
        remove: (k: string, o: CookieOptions) => res.cookies.set({ name: k, value: "", ...o, maxAge: 0 }),
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      // Redirect unauthenticated to staff login with return path
      const login = new URL("/staff/login", origin);
      login.searchParams.set("redirect", pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
    return res;
  } catch {
    // On SSR auth failure, allow and let client handle (prevents hard 500s)
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts).*)"],
};
