/**
 * OAuth Callback Route
 * Handles the callback from Shopify OAuth and exchanges code for access token
 */

import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForToken, storeAccessToken, verifyHmac } from "@/lib/shopify/oauth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const shop = searchParams.get("shop")
    const state = searchParams.get("state")
    const hmac = searchParams.get("hmac")

    // Verify required parameters
    if (!code || !shop || !state || !hmac) {
      return NextResponse.json(
        { error: "Missing required OAuth parameters" },
        { status: 400 }
      )
    }

    // Verify state matches (CSRF protection)
    const storedState = request.cookies.get("shopify_oauth_state")?.value
    const storedShop = request.cookies.get("shopify_shop")?.value

    if (!storedState || state !== storedState) {
      return NextResponse.json(
        { error: "Invalid state parameter" },
        { status: 400 }
      )
    }

    if (!storedShop || shop !== storedShop) {
      return NextResponse.json(
        { error: "Shop mismatch" },
        { status: 400 }
      )
    }

    // Verify HMAC signature
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    if (!verifyHmac(queryParams)) {
      return NextResponse.json(
        { error: "Invalid HMAC signature" },
        { status: 403 }
      )
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(shop, code)

    // Store access token
    await storeAccessToken(tokenData)

    // Clear temporary OAuth cookies
    const response = NextResponse.redirect(new URL("/", request.url))
    response.cookies.delete("shopify_oauth_state")
    response.cookies.delete("shopify_shop")

    return response
  } catch (error) {
    console.error("[OAuth Callback] Error:", error)
    return NextResponse.json(
      { error: "Failed to complete OAuth flow" },
      { status: 500 }
    )
  }
}
