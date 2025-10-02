// path: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Skip APIs/assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  ) return NextResponse.next();

  // Public pages (no SSR redirects)
  const PUBLIC = new Set([
    "/", "/login", "/signup", "/forgot-password", "/reset-password", "/staff/login"
  ]);

  // Dashboards are client-guarded
  if (
    pathname === "/dashboard" || pathname.startsWith("/dashboard/") ||
    pathname === "/patient/dashboard" || pathname.startsWith("/patient/dashboard/")
  ) return NextResponse.next();

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
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return response;

      // Fetch role; if it fails, do not block public pages.
      let role: "patient" | "staff" | "admin" | null = null;
      try {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        role = (p?.role as any) ?? null;
      } catch {}

      // Route to the right dashboard automatically
      if (pathname === "/login" && role === "patient")
        return NextResponse.redirect(new URL("/patient/dashboard", origin));
      if (pathname === "/staff/login" && role !== "patient")
        return NextResponse.redirect(new URL("/dashboard", origin));
    } catch { /* ignore */ }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico|assets|images|fonts).*)"],
};
