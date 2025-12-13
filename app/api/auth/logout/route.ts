import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAuthConfig,
} from "@/lib/shopify/auth"

export async function GET() {
  try {
    const config = getAuthConfig()
    const cookieStore = await cookies()
    
    // Clear auth cookies
    cookieStore.delete(AUTH_COOKIE_NAME)
    cookieStore.delete(REFRESH_COOKIE_NAME)
    
    // Redirect to Shopify logout if configured, otherwise to home
    if (config.shopId) {
      // Build logout URL with post-logout redirect
      const logoutUrl = new URL(config.logoutEndpoint)
      logoutUrl.searchParams.set("id_token_hint", "") // Optional: add ID token if stored
      logoutUrl.searchParams.set("post_logout_redirect_uri", config.siteUrl)
      
      return NextResponse.redirect(config.siteUrl)
    }
    
    return NextResponse.redirect(config.siteUrl)
  } catch (error) {
    console.error("Logout error:", error)
    const config = getAuthConfig()
    return NextResponse.redirect(config.siteUrl)
  }
}

export async function POST() {
  return GET()
}
