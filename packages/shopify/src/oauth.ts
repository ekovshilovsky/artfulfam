/**
 * Shopify OAuth helpers for multi-tenant app installation
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface ShopifyOAuthConfig {
  apiKey: string;
  apiSecret: string;
  scopes: string[];
  hostName: string;
}

export interface OAuthSession {
  shop: string;
  state: string;
  createdAt: Date;
}

/**
 * Generate the OAuth authorization URL
 */
export function buildAuthUrl(
  config: ShopifyOAuthConfig,
  shop: string,
  state: string,
  redirectPath = '/shopify/callback'
): string {
  const params = new URLSearchParams({
    client_id: config.apiKey,
    scope: config.scopes.join(','),
    redirect_uri: `https://${config.hostName}${redirectPath}`,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: ShopifyOAuthConfig,
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    scope: string;
  };
  return {
    accessToken: data.access_token,
    scope: data.scope,
  };
}

/**
 * Verify OAuth callback HMAC signature
 */
export function verifyOAuthCallback(
  config: ShopifyOAuthConfig,
  query: Record<string, string>
): boolean {
  const { hmac, ...params } = query;
  if (!hmac) return false;

  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const calculatedHmac = createHmac('sha256', config.apiSecret)
    .update(sortedParams)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(calculatedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a random state string for OAuth
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
