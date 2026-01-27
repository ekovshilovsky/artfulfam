import { NextResponse, type NextRequest } from "next/server";

const ADMIN_MATCHER = "/admin";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

// Using middleware.ts for Vercel Edge runtime
// Note: middleware.ts is deprecated in Next.js 16 but still works for Edge
export const middleware = (request: NextRequest) => {
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
  runtime: "edge",
};
