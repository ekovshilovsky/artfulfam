import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  fetchCustomer,
  refreshAccessToken,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "@/lib/shopify/auth"

export async function GET() {
  try {
    const cookieStore = await cookies()
    let accessToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value
    
    // No tokens = not logged in
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ customer: null, isLoggedIn: false })
    }
    
    // Try to fetch customer with current access token
    if (accessToken) {
      const customer = await fetchCustomer(accessToken)
      if (customer) {
        return NextResponse.json({ customer, isLoggedIn: true })
      }
    }
    
    // Access token expired or invalid, try to refresh
    if (refreshToken) {
      try {
        const tokens = await refreshAccessToken(refreshToken)
        
        // Update cookies with new tokens
        const accessTokenOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
          maxAge: tokens.expires_in,
          path: "/",
        }
        
        cookieStore.set(AUTH_COOKIE_NAME, tokens.access_token, accessTokenOptions)
        
        if (tokens.refresh_token) {
          const refreshTokenOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
          }
          cookieStore.set(REFRESH_COOKIE_NAME, tokens.refresh_token, refreshTokenOptions)
        }
        
        // Fetch customer with new access token
        const customer = await fetchCustomer(tokens.access_token)
        if (customer) {
          return NextResponse.json({ customer, isLoggedIn: true })
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError)
        // Clear invalid tokens
        cookieStore.delete(AUTH_COOKIE_NAME)
        cookieStore.delete(REFRESH_COOKIE_NAME)
      }
    }
    
    return NextResponse.json({ customer: null, isLoggedIn: false })
  } catch (error) {
    console.error("Customer fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer data", isLoggedIn: false },
      { status: 500 }
    )
  }
}
