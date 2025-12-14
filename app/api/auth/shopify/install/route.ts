/**
 * OAuth Install Route
 * Initiates the Shopify OAuth authorization code grant flow
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthorizationUrl } from "@/lib/shopify/oauth"
import { randomBytes } from "crypto"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      )
    }

    // Generate a random state for CSRF protection
    const state = randomBytes(32).toString("hex")

    // Store state in cookie for verification in callback
    const response = NextResponse.redirect(getAuthorizationUrl(shop, state))
    
    response.cookies.set("shopify_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    })

    response.cookies.set("shopify_shop", shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[OAuth Install] Error:", error)
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    )
  }
}
