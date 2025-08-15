import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /dashboard, /login)
  const path = request.nextUrl.pathname

  // Define paths that require authentication
  const protectedPaths = ["/dashboard"]

  // Define public paths that should redirect to dashboard if already authenticated
  const publicPaths = ["/login", "/signup"]

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some((protectedPath) => path.startsWith(protectedPath))

  // Check if the path is public
  const isPublicPath = publicPaths.includes(path)

  const authToken = request.cookies.get("auth_token")?.value || request.cookies.get("patient_auth")?.value

  // Redirect to login if trying to access protected route without token
  if (isProtectedPath && !authToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to dashboard if trying to access public route with token
  if (isPublicPath && authToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
