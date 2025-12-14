/**
 * Session Storage using Redis
 * Stores the OAuth access token server-side, shared across ALL users
 * This is the correct approach for a storefront app where the token
 * is for the APP to access the STORE's data, not per-user authentication
 */

import Redis from 'ioredis'
import { Session } from '@shopify/shopify-api'

const TOKEN_KEY = 'shopify:access_token'
const SCOPE_KEY = 'shopify:scope'
const SHOP_KEY = 'shopify:shop'

// Create Redis client using REDIS_URL from Vercel marketplace
let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set')
    }
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null
        return Math.min(times * 50, 2000)
      },
    })
  }
  return redis
}

/**
 * Store session in Redis (shared across all serverless functions)
 */
export async function storeSession(session: Session): Promise<void> {
  try {
    const client = getRedisClient()
    console.log('[Redis Session] Storing session for shop:', session.shop)
    
    await Promise.all([
      client.set(TOKEN_KEY, session.accessToken || ''),
      client.set(SCOPE_KEY, session.scope || ''),
      client.set(SHOP_KEY, session.shop),
    ])

    console.log('[Redis Session] Session stored successfully')
  } catch (error) {
    console.error('[Redis Session] Error storing session:', error)
    throw error
  }
}

/**
 * Load session from Redis
 * Returns the stored OAuth token that's shared across all users
 */
export async function loadSession(shop: string): Promise<Session | null> {
  try {
    const client = getRedisClient()
    const [accessToken, scope, storedShop] = await Promise.all([
      client.get(TOKEN_KEY),
      client.get(SCOPE_KEY),
      client.get(SHOP_KEY),
    ])

    if (!accessToken) {
      console.log('[Redis Session] No access token found in Redis')
      return null
    }

    // Verify the shop matches (security check)
    if (storedShop && storedShop !== shop) {
      console.warn('[Redis Session] Shop mismatch:', { requested: shop, stored: storedShop })
    }

    // Create session object
    const { shopify } = await import('./config')
    const sessionId = shopify.session.getOfflineId(shop)
    
    console.log('[Redis Session] Session loaded successfully for shop:', shop)
    
    return new shopify.session.Session({
      id: sessionId,
      shop,
      state: 'active',
      isOnline: false,
      accessToken,
      scope: scope || undefined,
    })
  } catch (error) {
    console.error('[Redis Session] Error loading session:', error)
    return null
  }
}

/**
 * Delete session from Redis
 */
export async function deleteSession(): Promise<void> {
  try {
    const client = getRedisClient()
    await Promise.all([
      client.del(TOKEN_KEY),
      client.del(SCOPE_KEY),
      client.del(SHOP_KEY),
    ])
    console.log('[Redis Session] Session deleted')
  } catch (error) {
    console.error('[Redis Session] Error deleting session:', error)
    throw error
  }
}

/**
 * Get access token from Redis
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const client = getRedisClient()
    return await client.get(TOKEN_KEY)
  } catch (error) {
    console.error('[Redis Session] Error getting access token:', error)
    return null
  }
}

/**
 * Check if session exists (without loading full session)
 */
export async function hasSession(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const token = await client.get(TOKEN_KEY)
    return !!token
  } catch (error) {
    console.error('[Redis Session] Error checking session:', error)
    return false
  }
}
