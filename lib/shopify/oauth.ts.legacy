/**
 * Shopify OAuth Authentication Module
 * Implements the authorization code grant flow for obtaining access tokens
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
 */

import { cookies } from "next/headers"

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Scopes required for the app
const REQUIRED_SCOPES = [
  "read_products",
  "read_customers",
  "write_customers",
  "read_orders",
].join(",")

export interface ShopifyAccessToken {
  access_token: string
  scope: string
  expires_in?: number
  associated_user_scope?: string
  associated_user?: {
    id: number
    first_name: string
    last_name: string
    email: string
    locale: string
    collaborator: boolean
  }
}

/**
 * Generate the authorization URL for Shopify OAuth
 */
export function getAuthorizationUrl(shop: string, state: string): string {
  if (!SHOPIFY_CLIENT_ID) {
    throw new Error("SHOPIFY_CLIENT_ID environment variable is not set")
  }

  const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`
  const redirectUri = `${APP_URL}/api/auth/shopify/callback`

  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: REQUIRED_SCOPES,
    redirect_uri: redirectUri,
    state: state,
    grant_options: "[]", // For per-user access tokens, use grant_options
  })

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(shop: string, code: string): Promise<ShopifyAccessToken> {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET environment variables must be set")
  }

  const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`
  const redirectUri = `${APP_URL}/api/auth/shopify/callback`

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code: code,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange code for token: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data
}

/**
 * Verify the HMAC signature from Shopify
 */
export function verifyHmac(query: Record<string, string>): boolean {
  if (!SHOPIFY_CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_SECRET environment variable is not set")
  }

  const { hmac, ...params } = query

  if (!hmac) {
    return false
  }

  // Sort parameters and create message
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")

  // Calculate HMAC
  const crypto = require("crypto")
  const generatedHmac = crypto.createHmac("sha256", SHOPIFY_CLIENT_SECRET).update(message).digest("hex")

  return generatedHmac === hmac
}

/**
 * Store access token in secure cookie
 */
export async function storeAccessToken(token: ShopifyAccessToken): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set("shopify_access_token", token.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year (Shopify tokens don't expire)
    path: "/",
  })

  cookieStore.set("shopify_scope", token.scope, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
}

/**
 * Get stored access token from cookie
 */
export async function getAccessToken(): Promise<string | null> {
  // First try to get from cookie (OAuth flow)
  const cookieStore = await cookies()
  const tokenFromCookie = cookieStore.get("shopify_access_token")?.value

  if (tokenFromCookie) {
    return tokenFromCookie
  }

  // Fallback to environment variable for backward compatibility or development
  return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || null
}

/**
 * Get Storefront API access token
 * Note: Storefront API uses a different token type
 */
export function getStorefrontAccessToken(): string | null {
  return process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || null
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken()
  return !!token
}

/**
 * Clear authentication
 */
export async function clearAuthentication(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("shopify_access_token")
  cookieStore.delete("shopify_scope")
}

/**
 * Make authenticated request to Shopify Admin API
 */
export async function shopifyAdminFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken()

  if (!token) {
    throw new Error("No access token available. Please authenticate first.")
  }

  if (!SHOPIFY_STORE_DOMAIN) {
    throw new Error("NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN environment variable is not set")
  }

  const shopDomain = SHOPIFY_STORE_DOMAIN.replace(".myshopify.com", "")
  const url = `https://${shopDomain}.myshopify.com${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify Admin API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}
