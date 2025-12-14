import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { kv } from '@vercel/kv'

/**
 * Middleware to handle Shopify OAuth redirects
 * Checks if OAuth token exists in KV store (shared across all users)
 * If no token, redirects to OAuth install
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for:
  // - OAuth routes (to avoid redirect loops)
  // - API routes (except auth routes)  
  // - Static files
  // - Next.js internals
  if (
    pathname.startsWith('/api/auth/shopify') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  try {
    // Check if we have an access token in KV (shared across all users)
    const hasAccessToken = await kv.exists('shopify:access_token')

    // If no access token, redirect to OAuth install
    if (!hasAccessToken) {
      const shop = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
      
      if (!shop) {
        console.error('[Middleware] NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN not set')
        return NextResponse.next()
      }

      // Redirect to install endpoint
      const installUrl = new URL('/api/auth/shopify/install', request.url)
      installUrl.searchParams.set('shop', shop)
      
      console.log('[Middleware] No OAuth session in KV - redirecting to install')
      return NextResponse.redirect(installUrl)
    }

    // Has access token in KV, continue
    return NextResponse.next()
  } catch (error) {
    console.error('[Middleware] Error checking KV:', error)
    // If KV check fails, let the request through
    // The actual API call will fail and log the error
    return NextResponse.next()
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled in function above)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
