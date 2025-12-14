import { NextResponse } from "next/server"
import { getAuthConfig, getSiteUrl } from "@/lib/shopify/auth"

// Debug endpoint to check auth configuration (only in development)
export async function GET() {
  // Only allow in development or with explicit flag
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_AUTH_DEBUG) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }
  
  const config = getAuthConfig()
  const siteUrl = getSiteUrl()
  
  return NextResponse.json({
    configured: {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      hasShopId: !!config.shopId,
      storeDomain: config.storeDomain || "(not set)",
    },
    urls: {
      siteUrl,
      redirectUri: config.redirectUri,
      authorizationEndpoint: config.authorizationEndpoint,
      tokenEndpoint: config.tokenEndpoint,
    },
    vercelEnv: {
      VERCEL_URL: process.env.VERCEL_URL || "(not set)",
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || "(not set)",
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL || "(not set)",
      VERCEL_ENV: process.env.VERCEL_ENV || "(not set)",
    },
    instructions: [
      "1. Make sure SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, and SHOPIFY_SHOP_ID are set",
      "2. Add this redirect URL to your Shopify app: " + config.redirectUri,
      "3. For preview deployments, you may need to add wildcard or multiple redirect URLs",
    ],
  })
}
