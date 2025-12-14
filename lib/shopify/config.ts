/**
 * Shopify API Configuration
 * Uses official @shopify/shopify-api package
 * Optimized for Vercel serverless deployment
 */

import { shopifyApi } from '@shopify/shopify-api'
import '@shopify/shopify-api/adapters/node'

/**
 * Get Shopify API instance (lazy initialization for build compatibility)
 */
let shopifyInstance: ReturnType<typeof shopifyApi> | null = null

export function getShopifyApi() {
  if (shopifyInstance) {
    return shopifyInstance
  }

  // Only validate in runtime, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    // Development/runtime checks
    if (!process.env.SHOPIFY_CLIENT_ID) {
      console.warn('SHOPIFY_CLIENT_ID is not set')
    }
    if (!process.env.SHOPIFY_CLIENT_SECRET) {
      console.warn('SHOPIFY_CLIENT_SECRET is not set')
    }
  }

  // Resolve the app URL for the environment
  // Prefer Vercel's runtime URL for Preview/Prod, fall back to NEXT_PUBLIC_APP_URL or localhost
  const resolvedAppUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  const HOST = new URL(resolvedAppUrl).host

  // Allow overriding API version via env; default to the latest stable shown in your screenshot
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'

  shopifyInstance = shopifyApi({
    apiKey: process.env.SHOPIFY_CLIENT_ID || '',
    apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET || '',
    scopes: [
      'read_products',
      'read_customers',
      'write_customers',
      'read_orders',
      'write_orders',
    ],
    hostName: HOST,
    hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
    apiVersion, // string value, e.g. '2025-10'
    isEmbeddedApp: false,
    // Do NOT set isCustomStoreApp for OAuth apps from the Partner (Dev) Dashboard
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
  })

  return shopifyInstance
}

// Export for backwards compatibility
export const shopify = new Proxy({} as ReturnType<typeof shopifyApi>, {
  get(target, prop) {
    return getShopifyApi()[prop as keyof ReturnType<typeof shopifyApi>]
  },
})

/**
 * Create a session for API calls
 * In Vercel's serverless environment, we store the token in cookies
 */
export function createSession(shop: string, accessToken: string) {
  const sessionId = shopify.session.getOfflineId(shop)
  const session = new shopify.session.Session({
    id: sessionId,
    shop,
    state: 'active',
    isOnline: false,
    accessToken,
  })
  return session
}

/**
 * Get the shop domain from environment
 */
export function getShopDomain(): string {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com'
  if (!domain || domain === 'your-store.myshopify.com') {
    // During build or when not configured
    return 'your-store.myshopify.com'
  }
  return domain.includes('.myshopify.com') ? domain : `${domain}.myshopify.com`
}
