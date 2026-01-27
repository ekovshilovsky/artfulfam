import { type NextRequest, NextResponse } from "next/server";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

// Route pattern for admin paths - matches /admin and /admin/*
const ADMIN_ROUTE = /^\/admin(\/|$)/;

/**
 * Next.js 16 Proxy - runs on Node.js runtime
 * Handles routing, headers, and lightweight auth checks
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const response = NextResponse.next();

  // Admin route protection - return 401 for unauthorized access
  if (ADMIN_ROUTE.test(pathname)) {
    const token =
      request.headers.get("x-admin-token") ??
      getBearerToken(request.headers.get("authorization")) ??
      searchParams.get("admin_token");

    if (!token || token !== process.env.ADMIN_TOKEN) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // Add security headers to all responses
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  // Matcher filters which routes invoke the proxy
  // Using :path* pattern for Next.js optimized route matching
  matcher: [
    "/admin/:path*", // Admin routes (auth required)
    "/((?!_next/static|_next/image|favicon.ico).*)", // All other routes (security headers)
  ],
};
