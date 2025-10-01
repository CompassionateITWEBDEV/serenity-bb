// File: /middleware.ts  — fixed to prevent login redirect loops
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/staff/login", // ← CRITICAL: allow staff login
]);

function isAssetOrApi(path: string) {
  return (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|map|txt|xml|woff2?|ttf|otf)$/.test(path)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 0) skip assets/api
  if (isAssetOrApi(pathname) || req.method === "OPTIONS") return NextResponse.next();

  // 1) Keep /dashboard client-guarded
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.next();
  }

  // 2) Short-circuit public routes (including /staff/login)
  if (PUBLIC.has(pathname)) {
    // tiny UX: if already authed, bounce /login|/signup to staff dashboard
    if (pathname === "/login" || pathname === "/signup") {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const res = NextResponse.next();
        const supabase = createServerClient(url, anon, {
          cookies: {
            get: (k) => req.cookies.get(k)?.value,
            set: (k, v, o: CookieOptions) => res.cookies.set({ name: k, value: v, ...o }),
            remove: (k, o: CookieOptions) => res.cookies.set({ name: k, value: "", ...o, maxAge: 0 }),
          },
        });
        const { data } = await supabase.auth.getUser();
        if (data?.user) return NextResponse.redirect(new URL("/staff/dashboard", req.url));
        return res;
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // 3) Server-guarded areas: /staff/** and /clinician/**
  const needsAuth = pathname.startsWith("/staff") || pathname.startsWith("/clinician");
  if (!needsAuth) return NextResponse.next();

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const res = NextResponse.next();

    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (k) => req.cookies.get(k)?.value,
        set: (k, v, o: CookieOptions) => res.cookies.set({ name: k, value: v, ...o }),
        remove: (k, o: CookieOptions) => res.cookies.set({ name: k, value: "", ...o, maxAge: 0 }),
      },
    });

    const { data } = await supabase.auth.getUser();
    const authed = !!data?.user;

    if (authed) return res;

    // Build safe return URL (avoid self-redirects and duplicate params)
    const current = pathname + search;
    const loginUrl = new URL("/staff/login", req.url);

    const sp = new URLSearchParams(search);
    const existing = sp.get("redirect");

    // Only set redirect if it’s not already pointing to /staff/login
    if (!existing || existing === "" || existing.startsWith("/staff/login")) {
      loginUrl.searchParams.set("redirect", pathname + search);
    } else {
      loginUrl.searchParams.set("redirect", existing);
    }

    return NextResponse.redirect(loginUrl);
  } catch {
    // fail-soft: let client guard handle it
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts).*)"],
};
