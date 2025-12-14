/**
 * Shopify API Configuration
 * Uses official @shopify/shopify-api package
 * Optimized for Vercel serverless deployment
 */

import { shopifyApi, ApiVersion } from '@shopify/shopify-api'
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

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const HOST = APP_URL.replace(/https?:\/\//, '')

  shopifyInstance = shopifyApi({
    apiKey: process.env.SHOPIFY_CLIENT_ID || 'placeholder',
    apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET || 'placeholder',
    scopes: [
      'read_products',
      'read_customers',
      'write_customers',
      'read_orders',
      'write_orders',
    ],
    hostName: HOST,
    hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
    apiVersion: ApiVersion.October24,
    isEmbeddedApp: false,
    isCustomStoreApp: true,
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
