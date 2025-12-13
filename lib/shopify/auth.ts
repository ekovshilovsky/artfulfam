/**
 * Shopify Customer Account API Authentication
 * 
 * This module implements OAuth 2.0 with PKCE for Shopify's headless customer authentication.
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: Your store domain (e.g., your-store.myshopify.com)
 * - SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: Client ID from Shopify Headless channel
 * - NEXT_PUBLIC_SITE_URL: Your site URL (e.g., https://your-site.vercel.app)
 * 
 * Setup instructions:
 * 1. In Shopify Admin, go to Settings > Apps and sales channels > Develop apps
 * 2. Create a new app or use Headless channel
 * 3. Configure Customer Account API access
 * 4. Add your callback URL: {NEXT_PUBLIC_SITE_URL}/api/auth/callback
 * 5. Copy the Client ID to SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID
 */

import { parseShopifyDomain } from "./parse-shopify-domain"

// Get shop ID from domain (numeric ID needed for auth URLs)
export function getShopId(): string {
  // The shop ID is typically set as an environment variable
  // You can find it in your Shopify Admin URL or via the Admin API
  return process.env.SHOPIFY_SHOP_ID || ""
}

export function getAuthConfig() {
  const rawDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || ""
  const storeDomain = rawDomain ? parseShopifyDomain(rawDomain) : ""
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID || ""
  const shopId = getShopId()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  
  return {
    storeDomain,
    clientId,
    shopId,
    siteUrl,
    redirectUri: `${siteUrl}/api/auth/callback`,
    // Shopify Customer Account API endpoints
    authorizationEndpoint: `https://shopify.com/authentication/${shopId}/oauth/authorize`,
    tokenEndpoint: `https://shopify.com/authentication/${shopId}/oauth/token`,
    customerApiEndpoint: `https://shopify.com/${shopId}/account/customer/api/2024-07/graphql`,
    logoutEndpoint: `https://shopify.com/authentication/${shopId}/logout`,
  }
}

// Generate a random string for PKCE code verifier
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// Generate code challenge from verifier (S256 method)
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return base64UrlEncode(new Uint8Array(digest))
}

// Generate a random state parameter
export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// Generate a nonce for ID token validation
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// Base64 URL encode (no padding, URL-safe characters)
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// Build authorization URL
export async function buildAuthorizationUrl(
  codeVerifier: string,
  state: string,
  nonce: string
): Promise<string> {
  const config = getAuthConfig()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "openid email customer-account-api:full",
    state: state,
    nonce: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })
  
  return `${config.authorizationEndpoint}?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const config = getAuthConfig()
  
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code: code,
    code_verifier: codeVerifier,
  })
  
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }
  
  return response.json()
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const config = getAuthConfig()
  
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  })
  
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }
  
  return response.json()
}

// Fetch customer data from Customer Account API
export async function fetchCustomer(accessToken: string): Promise<CustomerData | null> {
  const config = getAuthConfig()
  
  const query = `
    query {
      customer {
        id
        firstName
        lastName
        email
        phone
        defaultAddress {
          address1
          address2
          city
          province
          country
          zip
        }
      }
    }
  `
  
  const response = await fetch(config.customerApiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  })
  
  if (!response.ok) {
    console.error("Failed to fetch customer:", await response.text())
    return null
  }
  
  const data = await response.json()
  return data.data?.customer || null
}

// Types
export interface TokenResponse {
  access_token: string
  refresh_token: string
  id_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface CustomerData {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  defaultAddress: {
    address1: string | null
    address2: string | null
    city: string | null
    province: string | null
    country: string | null
    zip: string | null
  } | null
}

// Cookie names
export const AUTH_COOKIE_NAME = "shopify_customer_token"
export const REFRESH_COOKIE_NAME = "shopify_refresh_token"
export const CODE_VERIFIER_COOKIE = "shopify_code_verifier"
export const STATE_COOKIE = "shopify_auth_state"
export const NONCE_COOKIE = "shopify_auth_nonce"
