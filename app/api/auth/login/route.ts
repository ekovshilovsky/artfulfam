import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  buildAuthorizationUrl,
  generateCodeVerifier,
  generateState,
  generateNonce,
  CODE_VERIFIER_COOKIE,
  STATE_COOKIE,
  NONCE_COOKIE,
  getAuthConfig,
} from "@/lib/shopify/auth"

export async function GET() {
  try {
    const config = getAuthConfig()
    
    // Check if auth is properly configured
    if (!config.clientId || !config.shopId) {
      return NextResponse.json(
        { error: "Shop login is not configured. Please set SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID and SHOPIFY_SHOP_ID environment variables." },
        { status: 503 }
      )
    }
    
    // Generate PKCE values
    const codeVerifier = generateCodeVerifier()
    const state = generateState()
    const nonce = generateNonce()
    
    // Build authorization URL
    const authUrl = await buildAuthorizationUrl(codeVerifier, state, nonce)
    
    // Store PKCE values in secure cookies
    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    }
    
    cookieStore.set(CODE_VERIFIER_COOKIE, codeVerifier, cookieOptions)
    cookieStore.set(STATE_COOKIE, state, cookieOptions)
    cookieStore.set(NONCE_COOKIE, nonce, cookieOptions)
    
    // Redirect to Shopify authorization
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Failed to initiate login" },
      { status: 500 }
    )
  }
}
