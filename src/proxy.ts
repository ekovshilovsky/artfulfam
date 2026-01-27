import { type NextRequest, NextResponse } from "next/server";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

/**
 * Next.js 16 Proxy - runs on Node.js runtime
 * Lightweight auth check for admin routes only
 * Security headers are configured in next.config.js
 */
export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Admin route protection - return 401 for unauthorized access
  const token =
    request.headers.get("x-admin-token") ??
    getBearerToken(request.headers.get("authorization")) ??
    searchParams.get("admin_token");

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  // Single matcher - proxy only runs for admin routes
  matcher: ["/admin/:path*"],
};
