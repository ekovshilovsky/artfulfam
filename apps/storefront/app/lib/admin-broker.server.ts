type BrokerTokenState = {
  accessToken: string;
  shop: string;
  createdAt: number;
  scope?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __artfulfamAdminBrokerTokens: Record<string, BrokerTokenState> | undefined;
}

export type AdminBrokerConfig = {
  enabled: boolean;
  shop: string | null;
  clientId: string | null;
  clientSecret: string | null;
  scopes: string;
  redirectUri: string | null;
};

/**
 * Placeholder Admin OAuth broker configuration.
 *
 * This is intentionally "minimal" and currently stores tokens in-memory,
 * which means tokens are lost on deploy/restart.
 *
 * Env vars:
 * - ADMIN_BROKER_ENABLED=true|false
 * - ADMIN_BROKER_SHOP=example.myshopify.com (optional; can be provided via ?shop=)
 * - ADMIN_BROKER_CLIENT_ID=...
 * - ADMIN_BROKER_CLIENT_SECRET=...
 * - ADMIN_BROKER_SCOPES=read_customers,write_customers (optional)
 * - ADMIN_BROKER_REDIRECT_URI=https://.../admin/broker/callback (optional)
 */
export function getAdminBrokerConfig(
  env?: Record<string, string | undefined>,
  requestOrigin?: string,
): AdminBrokerConfig {
  const enabled =
    String(env?.ADMIN_BROKER_ENABLED || '').toLowerCase() === 'true';

  const shop = env?.ADMIN_BROKER_SHOP ? normalizeShopDomain(env.ADMIN_BROKER_SHOP) : null;
  const clientId = env?.ADMIN_BROKER_CLIENT_ID || null;
  const clientSecret = env?.ADMIN_BROKER_CLIENT_SECRET || null;
  const scopes = env?.ADMIN_BROKER_SCOPES || 'read_customers,write_customers';
  const redirectUri =
    env?.ADMIN_BROKER_REDIRECT_URI ||
    (requestOrigin ? `${requestOrigin}/admin/broker/callback` : null);

  return {enabled, shop, clientId, clientSecret, scopes, redirectUri};
}

export function storeBrokerToken(token: BrokerTokenState) {
  const key = normalizeShopDomain(token.shop);
  globalThis.__artfulfamAdminBrokerTokens ||= {};
  globalThis.__artfulfamAdminBrokerTokens[key] = {
    ...token,
    shop: key,
  };
}

export function getBrokerToken(shop: string) {
  const key = normalizeShopDomain(shop);
  return globalThis.__artfulfamAdminBrokerTokens?.[key] ?? null;
}

export function listBrokerTokenShops() {
  return Object.keys(globalThis.__artfulfamAdminBrokerTokens || {});
}

export async function generateRandomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function verifyShopifyHmac(params: URLSearchParams, clientSecret: string) {
  const providedHmac = params.get('hmac');
  if (!providedHmac) return false;

  const entries: Array<[string, string]> = [];
  params.forEach((value, key) => {
    if (key === 'hmac' || key === 'signature') return;
    entries.push([key, value]);
  });

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const message = entries.map(([k, v]) => `${k}=${v}`).join('&');

  const computed = await hmacSha256Hex(clientSecret, message);
  return timingSafeEqual(computed, providedHmac);
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(aHex: string, bHex: string) {
  if (aHex.length !== bHex.length) return false;
  let result = 0;
  for (let i = 0; i < aHex.length; i++) {
    result |= aHex.charCodeAt(i) ^ bHex.charCodeAt(i);
  }
  return result === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function normalizeShopDomain(input: string) {
  const raw = input.trim();
  if (!raw) return raw;
  try {
    const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.hostname;
  } catch {
    return raw.replace(/^https?:\/\//, '').split('/')[0];
  }
}

