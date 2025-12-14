/**
 * Session Storage for Vercel
 * Uses cookies for serverless compatibility
 */

import { cookies } from 'next/headers'
import { Session } from '@shopify/shopify-api'

const TOKEN_COOKIE_NAME = 'shopify_access_token'
const SCOPE_COOKIE_NAME = 'shopify_scope'

/**
 * Store session in cookies (Vercel-compatible)
 */
export async function storeSession(session: Session): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(TOKEN_COOKIE_NAME, session.accessToken || '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  })

  if (session.scope) {
    cookieStore.set(SCOPE_COOKIE_NAME, session.scope, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }
}

/**
 * Load session from cookies
 */
export async function loadSession(shop: string): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(TOKEN_COOKIE_NAME)?.value
    const scope = cookieStore.get(SCOPE_COOKIE_NAME)?.value

    if (!accessToken) {
      return null
    }

    // Create session object
    const { shopify } = await import('./config')
    const sessionId = shopify.session.getOfflineId(shop)
    
    return new shopify.session.Session({
      id: sessionId,
      shop,
      state: 'active',
      isOnline: false,
      accessToken,
      scope,
    })
  } catch (error) {
    // During build, cookies() might fail - return null
    console.log('[Session] Could not load session (likely build time)')
    return null
  }
}

/**
 * Delete session from cookies
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_COOKIE_NAME)
  cookieStore.delete(SCOPE_COOKIE_NAME)
}

/**
 * Get access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value || null
}
