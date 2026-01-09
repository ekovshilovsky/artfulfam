export type SignupTokenPayload = {
  v: 1;
  iat: number; // seconds
  exp: number; // seconds
  shop: string;
  email: string;
  customerId?: string;
  // Whether this token is allowed to write PII updates (phone/SMS) for this customer.
  // This must be true ONLY for customers created in the current signup flow.
  allowPhoneCapture?: boolean;
};

function bytesToBase64(bytes: Uint8Array): string {
  // Convert bytes to binary string for btoa (safe here: we control bytes).
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(input: Uint8Array): string {
  return bytesToBase64(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return base64ToBytes(padded);
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  // Constant-time-ish comparison over characters
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getSignupTokenSecret(env?: Record<string, string | undefined>): string | null {
  // Prefer explicit; fall back to broker secret for cross-deploy verification; last resort session secret.
  return env?.SIGNUP_TOKEN_SECRET || env?.BROKER_SHARED_SECRET || env?.SESSION_SECRET || null;
}

export async function signSignupToken(params: {
  secret: string;
  shop: string;
  email: string;
  customerId?: string;
  allowPhoneCapture?: boolean;
  ttlSeconds?: number;
}): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = params.ttlSeconds ?? 15 * 60;
  const payload: SignupTokenPayload = {
    v: 1,
    iat: nowSec,
    exp: nowSec + ttl,
    shop: params.shop,
    email: params.email,
    ...(params.customerId ? {customerId: params.customerId} : null),
    ...(params.allowPhoneCapture ? {allowPhoneCapture: true} : null),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadJson));
  const signatureB64 = await hmacSha256Base64Url(params.secret, payloadB64);
  return `${payloadB64}.${signatureB64}`;
}

export async function verifySignupToken(params: {
  secret: string;
  token: string;
  expectedShop?: string;
}): Promise<{ok: true; payload: SignupTokenPayload} | {ok: false; error: string}> {
  const parts = String(params.token || '').split('.');
  if (parts.length !== 2) return {ok: false, error: 'Invalid signupToken format'};

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return {ok: false, error: 'Invalid signupToken format'};

  const expectedSig = await hmacSha256Base64Url(params.secret, payloadB64);
  if (!timingSafeEqualString(expectedSig, sigB64)) return {ok: false, error: 'Invalid signupToken signature'};

  let payload: SignupTokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as SignupTokenPayload;
  } catch {
    return {ok: false, error: 'Invalid signupToken payload'};
  }

  if (payload?.v !== 1) return {ok: false, error: 'Unsupported signupToken version'};
  if (!payload.shop || !payload.email) return {ok: false, error: 'Invalid signupToken payload'};

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return {ok: false, error: 'signupToken expired'};
  if (params.expectedShop && payload.shop !== params.expectedShop) {
    return {ok: false, error: 'signupToken shop mismatch'};
  }

  return {ok: true, payload};
}

