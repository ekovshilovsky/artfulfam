export type BrokerAuthHeaders = {
  'X-Broker-Timestamp': string;
  'X-Broker-Signature': string;
  'X-Broker-Shop'?: string;
};

export function getBrokerSharedSecret(env?: Record<string, string | undefined>) {
  return env?.BROKER_SHARED_SECRET || null;
}

/**
 * Sign a JSON body for broker requests.
 *
 * Signature is: HMAC_SHA256_HEX(secret, `${timestamp}.${rawBody}`)
 */
export async function signBrokerRequest(
  secret: string,
  rawBody: string,
  timestampMs: number = Date.now(),
  shop?: string,
): Promise<BrokerAuthHeaders> {
  const ts = String(timestampMs);
  const message = shop ? `${ts}.${shop}.${rawBody}` : `${ts}.${rawBody}`;
  const signature = await hmacSha256Hex(secret, message);
  return {
    'X-Broker-Timestamp': ts,
    'X-Broker-Signature': signature,
    ...(shop ? {'X-Broker-Shop': shop} : null),
  };
}

/**
 * Verify broker signature headers against raw request body.
 *
 * - Requires `X-Broker-Timestamp` and `X-Broker-Signature`
 * - Rejects requests outside +/- `maxSkewMs`
 */
export async function verifyBrokerRequestSignature(params: {
  secret: string;
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  shopHeader?: string | null;
  maxSkewMs?: number;
}): Promise<{ok: true} | {ok: false; error: string}> {
  const {secret, rawBody, timestampHeader, signatureHeader, shopHeader} = params;
  const maxSkewMs = params.maxSkewMs ?? 5 * 60 * 1000;

  if (!timestampHeader || !signatureHeader) {
    return {ok: false, error: 'Missing broker auth headers'};
  }

  const timestampMs = Number(timestampHeader);
  if (!Number.isFinite(timestampMs)) {
    return {ok: false, error: 'Invalid broker timestamp'};
  }

  const skew = Math.abs(Date.now() - timestampMs);
  if (skew > maxSkewMs) {
    return {ok: false, error: 'Broker request timestamp out of range'};
  }

  // Backwards compatible:
  // - If X-Broker-Shop is present, prefer binding it into signature message.
  // - Otherwise verify legacy `${ts}.${rawBody}` signature.
  if (shopHeader) {
    const expectedWithShop = await hmacSha256Hex(secret, `${timestampHeader}.${shopHeader}.${rawBody}`);
    if (!timingSafeEqualHex(expectedWithShop, signatureHeader)) {
      return {ok: false, error: 'Invalid broker signature'};
    }
  } else {
    const expected = await hmacSha256Hex(secret, `${timestampHeader}.${rawBody}`);
    if (!timingSafeEqualHex(expected, signatureHeader)) {
      return {ok: false, error: 'Invalid broker signature'};
    }
  }

  return {ok: true};
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

function timingSafeEqualHex(aHex: string, bHex: string) {
  if (aHex.length !== bHex.length) return false;
  let result = 0;
  for (let i = 0; i < aHex.length; i++) {
    result |= aHex.charCodeAt(i) ^ bHex.charCodeAt(i);
  }
  return result === 0;
}

