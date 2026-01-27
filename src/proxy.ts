import { type NextRequest, NextResponse } from "next/server";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

/**
 * Next.js 16 Proxy - runs on Node.js runtime
 * Handles routing, headers, and lightweight auth checks
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Admin route protection - return 401 for programmatic access
  if (pathname.startsWith("/admin")) {
    const token =
      request.headers.get("x-admin-token") ??
      getBearerToken(request.headers.get("authorization")) ??
      searchParams.get("admin_token");

    if (!token || token !== process.env.ADMIN_TOKEN) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

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
