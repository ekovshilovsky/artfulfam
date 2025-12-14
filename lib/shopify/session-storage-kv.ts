/**
 * Session Storage using Vercel KV
 * Stores the OAuth access token server-side, shared across ALL users
 * This is the correct approach for a storefront app where the token
 * is for the APP to access the STORE's data, not per-user authentication
 */

import { kv } from '@vercel/kv'
import { Session } from '@shopify/shopify-api'

const TOKEN_KEY = 'shopify:access_token'
const SCOPE_KEY = 'shopify:scope'
const SHOP_KEY = 'shopify:shop'

/**
 * Store session in Vercel KV (shared across all serverless functions)
 */
export async function storeSession(session: Session): Promise<void> {
  try {
    console.log('[KV Session] Storing session for shop:', session.shop)
    
    await Promise.all([
      kv.set(TOKEN_KEY, session.accessToken || ''),
      kv.set(SCOPE_KEY, session.scope || ''),
      kv.set(SHOP_KEY, session.shop),
    ])

    console.log('[KV Session] Session stored successfully')
  } catch (error) {
    console.error('[KV Session] Error storing session:', error)
    throw error
  }
}

/**
 * Load session from Vercel KV
 * Returns the stored OAuth token that's shared across all users
 */
export async function loadSession(shop: string): Promise<Session | null> {
  try {
    const [accessToken, scope, storedShop] = await Promise.all([
      kv.get<string>(TOKEN_KEY),
      kv.get<string>(SCOPE_KEY),
      kv.get<string>(SHOP_KEY),
    ])

    if (!accessToken) {
      console.log('[KV Session] No access token found in KV')
      return null
    }

    // Verify the shop matches (security check)
    if (storedShop && storedShop !== shop) {
      console.warn('[KV Session] Shop mismatch:', { requested: shop, stored: storedShop })
    }

    // Create session object
    const { shopify } = await import('./config')
    const sessionId = shopify.session.getOfflineId(shop)
    
    console.log('[KV Session] Session loaded successfully for shop:', shop)
    
    return new shopify.session.Session({
      id: sessionId,
      shop,
      state: 'active',
      isOnline: false,
      accessToken,
      scope: scope || undefined,
    })
  } catch (error) {
    console.error('[KV Session] Error loading session:', error)
    return null
  }
}

/**
 * Delete session from Vercel KV
 */
export async function deleteSession(): Promise<void> {
  try {
    await Promise.all([
      kv.del(TOKEN_KEY),
      kv.del(SCOPE_KEY),
      kv.del(SHOP_KEY),
    ])
    console.log('[KV Session] Session deleted')
  } catch (error) {
    console.error('[KV Session] Error deleting session:', error)
    throw error
  }
}

/**
 * Get access token from Vercel KV
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await kv.get<string>(TOKEN_KEY)
  } catch (error) {
    console.error('[KV Session] Error getting access token:', error)
    return null
  }
}

/**
 * Check if session exists (without loading full session)
 */
export async function hasSession(): Promise<boolean> {
  try {
    const token = await kv.get<string>(TOKEN_KEY)
    return !!token
  } catch (error) {
    console.error('[KV Session] Error checking session:', error)
    return false
  }
}
