import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === "/" || path === "/login" || path === "/register"

  // Get the session cookie
  const sessionCookie = request.cookies.get("session")?.value
  const authToken = request.cookies.get("authToken")?.value

  // If the path is not public and session/token is missing, redirect to login
  if (!isPublicPath && (!sessionCookie || !authToken)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If the path is for teacher dashboard and the user is not a teacher, redirect to login
  if (path.startsWith("/admin") && sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie)
      const role = session.role ?? (session.isAdmin ? "teacher" : "student")
      if (role !== "teacher") {
        return NextResponse.redirect(new URL("/login?role=teacher", request.url))
      }
    } catch (error) {
      return NextResponse.redirect(new URL("/login?role=teacher", request.url))
    }
  }

  // Allow logged-in users to access /login and /register so they can switch accounts.
  // Route-level guards still protect /admin and /student pages.

  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
