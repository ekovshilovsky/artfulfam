type AdminTokenState = {
  accessToken: string;
  shop: string;
  createdAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __artfulfamAdminToken: AdminTokenState | undefined;
}

export function getAdminAccessToken(env?: Record<string, string | undefined>) {
  const tokenFromEnv = env?.PRIVATE_ADMIN_API_TOKEN;
  if (tokenFromEnv) {
    return {
      accessToken: tokenFromEnv,
      // For env-provided tokens, do NOT infer the target shop from SHOPIFY_ADMIN_SHOP
      // (which may be used for other flows like broker/dev OAuth).
      shop: null,
      source: 'env' as const,
    };
  }

  const tokenFromMemory = globalThis.__artfulfamAdminToken;
  if (tokenFromMemory?.accessToken) {
    return {
      accessToken: tokenFromMemory.accessToken,
      shop: tokenFromMemory.shop,
      source: 'memory' as const,
    };
  }

  return {accessToken: null, shop: null, source: null};
}

export function setAdminAccessToken(accessToken: string, shop: string) {
  globalThis.__artfulfamAdminToken = {
    accessToken,
    shop: normalizeShopDomain(shop),
    createdAt: Date.now(),
  };
}

export async function generateRandomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function verifyShopifyHmac(params: URLSearchParams, clientSecret: string) {
  const providedHmac = params.get('hmac');
  if (!providedHmac) return false;

  const entries: Array<[string, string]> = [];
  params.forEach((value, key) => {
    if (key === 'hmac' || key === 'signature') return;
    entries.push([key, value]);
  });

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const message = entries.map(([k, v]) => `${k}=${v}`).join('&');

  return hmacSha256Hex(clientSecret, message).then((computed) => timingSafeEqual(computed, providedHmac));
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

  // If it's a URL, parse it and grab hostname
  try {
    const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.hostname;
  } catch {
    // Fallback: strip common prefixes/path
    return raw.replace(/^https?:\/\//, '').split('/')[0];
  }
}

