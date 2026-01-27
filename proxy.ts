import { NextResponse, type NextRequest } from "next/server";

const ADMIN_MATCHER = "/admin";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

// Next.js 16+ uses proxy.ts instead of middleware.ts
// The proxy function runs on Node.js runtime
export const proxy = (request: NextRequest) => {
  const { pathname, searchParams } = request.nextUrl;

  if (!pathname.startsWith(ADMIN_MATCHER)) {
    return NextResponse.next();
  }

  const token =
    request.headers.get("x-admin-token") ??
    getBearerToken(request.headers.get("authorization")) ??
    searchParams.get("admin_token");

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/admin/:path*"],
  // Next.js 16 proxy runs on Node.js runtime (Edge is no longer supported)
  runtime: "nodejs",
};
