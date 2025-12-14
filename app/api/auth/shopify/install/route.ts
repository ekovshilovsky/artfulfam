/**
 * OAuth Install Route (Modern Implementation)
 * Uses @shopify/shopify-api
 */

import { NextRequest, NextResponse } from "next/server"
import { shopify } from "@/lib/shopify/config"
import { parseShopifyDomain } from "@/lib/shopify/parse-shopify-domain"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawShop = searchParams.get("shop") || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || ""

    // Normalize input: decode, trim, drop newlines, lowercase, add .myshopify.com if missing
    const cleaned = decodeURIComponent(rawShop).trim().replace(/[\n\r]/g, "").toLowerCase()
    if (!cleaned) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      )
    }

    const candidate = parseShopifyDomain(cleaned)

    // Sanitize shop domain
    const sanitizedShop = shopify.utils.sanitizeShop(candidate, true)
    if (!sanitizedShop) {
      return NextResponse.json(
        { error: "Invalid shop domain", details: candidate },
        { status: 400 }
      )
    }

    // Start OAuth flow
    const authRoute = await shopify.auth.begin({
      shop: sanitizedShop,
      callbackPath: '/api/auth/shopify/callback',
      isOnline: false, // Offline token (doesn't expire)
    })

    // Store state in cookie for verification
    const response = NextResponse.redirect(authRoute)
    
    // The state is included in the authRoute URL, extract it
    const authUrl = new URL(authRoute)
    const state = authUrl.searchParams.get('state')
    
    if (state) {
      response.cookies.set('shopify_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
        path: '/',
      })
    }

    response.cookies.set('shopify_shop', sanitizedShop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    return response
  } catch (error) {
    console.error("[OAuth Install] Error:", error)
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
