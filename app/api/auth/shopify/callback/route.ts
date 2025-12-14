/**
 * OAuth Callback Route (Modern Implementation)
 * Uses @shopify/shopify-api
 */

import { NextRequest, NextResponse } from "next/server"
import { shopify } from "@/lib/shopify/config"
import { storeSession } from "@/lib/shopify/session-storage"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Get shop from cookie
    const storedShop = request.cookies.get('shopify_shop')?.value
    const storedState = request.cookies.get('shopify_oauth_state')?.value

    if (!storedShop) {
      return NextResponse.json(
        { error: "Missing shop from cookies" },
        { status: 400 }
      )
    }

    // Verify state parameter (CSRF protection)
    const state = searchParams.get('state')
    if (!state || state !== storedState) {
      return NextResponse.json(
        { error: "Invalid state parameter" },
        { status: 403 }
      )
    }

    // Complete OAuth callback
    const callbackResponse = await shopify.auth.callback({
      rawRequest: request as any,
    })

    // Store session
    await storeSession(callbackResponse.session)

    console.log('[OAuth Callback] Authentication successful:', {
      shop: callbackResponse.session.shop,
      hasToken: !!callbackResponse.session.accessToken,
    })

    // Clear temporary OAuth cookies and redirect to home
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('shopify_oauth_state')
    response.cookies.delete('shopify_shop')

    return response
  } catch (error) {
    console.error("[OAuth Callback] Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to complete OAuth flow",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
