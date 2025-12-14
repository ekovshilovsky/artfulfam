/**
 * Shopify API Configuration
 * Uses official @shopify/shopify-api package
 * Optimized for Vercel serverless deployment
 */

import { shopifyApi, LATEST_API_VERSION, ApiVersion } from '@shopify/shopify-api'
import '@shopify/shopify-api/adapters/node'

if (!process.env.SHOPIFY_CLIENT_ID) {
  throw new Error('SHOPIFY_CLIENT_ID is required')
}

if (!process.env.SHOPIFY_CLIENT_SECRET) {
  throw new Error('SHOPIFY_CLIENT_SECRET is required')
}

if (!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) {
  throw new Error('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is required')
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const HOST = APP_URL.replace(/https?:\/\//, '')

// Initialize Shopify API
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_CLIENT_ID,
  apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
  scopes: [
    'read_products',
    'read_customers',
    'write_customers',
    'read_orders',
    'write_orders',
  ],
  hostName: HOST,
  hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false, // Custom storefront, not embedded
  isCustomStoreApp: true, // Single-store custom app
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
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
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!
  return domain.includes('.myshopify.com') ? domain : `${domain}.myshopify.com`
}
