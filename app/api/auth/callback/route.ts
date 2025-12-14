import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  exchangeCodeForTokens,
  CODE_VERIFIER_COOKIE,
  STATE_COOKIE,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAuthConfig,
} from "@/lib/shopify/auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    
    const config = getAuthConfig()
    const cookieStore = await cookies()
    
    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        `${config.siteUrl}?auth_error=${encodeURIComponent(errorDescription || error)}`
      )
    }
    
    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${config.siteUrl}?auth_error=${encodeURIComponent("Missing authorization code or state")}`
      )
    }
    
    // Validate state to prevent CSRF
    const storedState = cookieStore.get(STATE_COOKIE)?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${config.siteUrl}?auth_error=${encodeURIComponent("Invalid state parameter")}`
      )
    }
    
    // Get code verifier for PKCE
    const codeVerifier = cookieStore.get(CODE_VERIFIER_COOKIE)?.value
    if (!codeVerifier) {
      return NextResponse.redirect(
        `${config.siteUrl}?auth_error=${encodeURIComponent("Missing code verifier")}`
      )
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier)
    
    // Create response with redirect
    const response = NextResponse.redirect(`${config.siteUrl}?auth_success=true`)
    
    // Store tokens in secure cookies
    const accessTokenOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: tokens.expires_in,
      path: "/",
    }
    
    const refreshTokenOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    }
    
    // Set auth cookies
    cookieStore.set(AUTH_COOKIE_NAME, tokens.access_token, accessTokenOptions)
    cookieStore.set(REFRESH_COOKIE_NAME, tokens.refresh_token, refreshTokenOptions)
    
    // Clear PKCE cookies
    cookieStore.delete(CODE_VERIFIER_COOKIE)
    cookieStore.delete(STATE_COOKIE)
    
    return response
  } catch (error) {
    console.error("Callback error:", error)
    const config = getAuthConfig()
    return NextResponse.redirect(
      `${config.siteUrl}?auth_error=${encodeURIComponent("Failed to complete authentication")}`
    )
  }
}
