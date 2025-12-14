import { NextResponse } from "next/server"
import { getAuthConfig, getSiteUrl } from "@/lib/shopify/auth"

// Debug endpoint to check auth configuration
export async function GET() {
  const config = getAuthConfig()
  const siteUrl = getSiteUrl()
  
  // Check if Shop ID looks valid (should be numeric)
  const shopIdValid = /^\d+$/.test(config.shopId)
  
  return NextResponse.json({
    status: {
      loginReady: !!(config.clientId && config.shopId && shopIdValid),
      passwordCheckReady: !!(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN),
    },
    configured: {
      SHOPIFY_CLIENT_ID: config.clientId ? `✓ Set (${config.clientId.substring(0, 8)}...)` : "✗ Not set",
      SHOPIFY_CLIENT_SECRET: config.clientSecret ? "✓ Set" : "✗ Not set (optional for public apps)",
      SHOPIFY_SHOP_ID: config.shopId ? (shopIdValid ? `✓ ${config.shopId}` : `⚠ "${config.shopId}" - should be numeric only`) : "✗ Not set",
      SHOPIFY_ADMIN_ACCESS_TOKEN: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? "✓ Set" : "✗ Not set (needed for password check)",
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? "✓ Set" : "✗ Not set",
      NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: config.storeDomain || "✗ Not set",
    },
    urls: {
      detectedSiteUrl: siteUrl,
      redirectUri: config.redirectUri,
      authorizationEndpoint: config.authorizationEndpoint,
      tokenEndpoint: config.tokenEndpoint,
      customerApiEndpoint: config.customerApiEndpoint,
    },
    vercelEnv: {
      VERCEL_ENV: process.env.VERCEL_ENV || "(not set)",
      VERCEL_URL: process.env.VERCEL_URL || "(not set)",
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || "(not set)",
    },
    shopifyAppSetup: {
      step1: "In Shopify Admin → Settings → Apps → Develop apps → Your app",
      step2: "Under 'Configuration', find your Client ID",
      step3: `Add this redirect URL: ${config.redirectUri}`,
      step4: "Enable 'Customer Account API' access",
      step5: "Get your Shop ID from your Shopify admin URL or use: /admin/api/2024-10/shop.json",
    },
    howToGetShopId: [
      "Option 1: Look at your Shopify admin URL - it contains the shop ID",
      "Option 2: Use Admin API: GET /admin/api/2024-10/shop.json → response.shop.id",
      "Option 3: In browser console on your Shopify admin: Shopify.shop.id",
      "The Shop ID should be a number like: 12345678",
    ],
  })
}
