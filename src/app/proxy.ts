import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy - runs on Node.js runtime
 * Used for routing (rewrites, redirects, headers) - NOT for auth
 * Auth should be handled in layouts or route handlers
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
