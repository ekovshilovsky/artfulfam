import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { kv } from '@vercel/kv'

/**
 * Proxy handles:
 * 1. OAuth redirect (auto-install when no token in KV)
 * 2. Password protection (store access cookie)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for API routes, static files, and coming soon page
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/coming-soon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)
  ) {
    return NextResponse.next()
  }

  try {
    // 1. Check if OAuth token exists in KV (shared across all users)
    const hasOAuthToken = await kv.exists('shopify:access_token')

    if (!hasOAuthToken) {
      const shop = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
      
      if (shop && !pathname.startsWith('/api/auth/shopify')) {
        // Redirect to OAuth install
        const installUrl = new URL('/api/auth/shopify/install', request.url)
        installUrl.searchParams.set('shop', shop)
        
        console.log('[Proxy] No OAuth token in KV - redirecting to install')
        return NextResponse.redirect(installUrl)
      }
    }

    // 2. Check password protection (store access cookie)
    const hasStoreAccess = request.cookies.get("store_access")?.value === "granted"

    // If no store access and not on home page, redirect to home
    // (home page will show coming soon if password protected)
    if (!hasStoreAccess && pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('[Proxy] Error:', error)
    // If check fails, let request through
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
}
