import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getAdminBrokerConfig, getBrokerToken, normalizeShopDomain} from '~/lib/admin-broker.server';
import {getBrokerSharedSecret, verifyBrokerRequestSignature} from '~/lib/broker-auth.server';
import {getSignupTokenSecret, verifySignupToken} from '~/lib/signup-token.server';
import {getRuntimeEnv} from '~/lib/runtime-env.server';

// Mirrors /api/update-customer-sms (same JSON shape)
export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const env = getRuntimeEnv((context as any).env as Record<string, string | undefined> | undefined);
  const cfg = getAdminBrokerConfig(env, new URL(request.url).origin);

  if (!cfg.enabled) return data({error: 'Admin broker is disabled.'}, {status: 403});

  const sharedSecret = getBrokerSharedSecret(env);
  if (!sharedSecret) return data({error: 'Missing BROKER_SHARED_SECRET on broker.'}, {status: 500});

  const shopHeader = request.headers.get('X-Broker-Shop') || request.headers.get('X-Shopify-Shop');

  const rawBody = await request.text();
  const verified = await verifyBrokerRequestSignature({
    secret: sharedSecret,
    rawBody,
    timestampHeader: request.headers.get('X-Broker-Timestamp'),
    signatureHeader: request.headers.get('X-Broker-Signature'),
    shopHeader: shopHeader ? normalizeShopDomain(shopHeader) : null,
  });
  if (!verified.ok) return data({error: verified.error}, {status: 401});

  let body: {email?: string; phone?: string; signupToken?: string; consent?: boolean; operation?: 'phone' | 'consent' | 'both'};
  try {
    body = JSON.parse(rawBody) as {email?: string; phone?: string; signupToken?: string; consent?: boolean; operation?: 'phone' | 'consent' | 'both'};
  } catch {
    return data({error: 'Invalid JSON'}, {status: 400});
  }

  const signupToken = String(body.signupToken || '');
  const emailFromBody = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '');
  const consent = body.consent;
  const operation = body.operation ?? 'both';
  if (operation !== 'phone' && operation !== 'consent' && operation !== 'both') {
    return data({error: 'Invalid operation'}, {status: 400});
  }
  if (operation === 'phone' || operation === 'both') {
    if (!phone) return data({error: 'Phone is required'}, {status: 400});
  }
  if (operation === 'consent' || operation === 'both') {
    if (consent !== true) return data({error: 'SMS consent is required'}, {status: 400});
  }

  const e164Phone =
    operation === 'phone' || operation === 'both'
      ? toE164(phone)
      : null;
  if ((operation === 'phone' || operation === 'both') && !e164Phone) {
    return data({error: 'Phone number must be a valid E.164 phone number.'}, {status: 400});
  }

  const shop = normalizeShopDomain(shopHeader || cfg.shop || '');
  if (!shop) return data({error: 'Missing shop'}, {status: 400});

  const signupTokenSecret = getSignupTokenSecret(env);
  if (!signupTokenSecret) return data({error: 'Missing SIGNUP_TOKEN_SECRET (or BROKER_SHARED_SECRET).'}, {status: 500});

  let tokenPayload: {shop: string; email: string; customerId?: string; allowPhoneCapture?: boolean} | null = null;
  if (signupToken) {
    const verifiedToken = await verifySignupToken({
      secret: signupTokenSecret,
      token: signupToken,
      expectedShop: shop,
    });
    if (!verifiedToken.ok) return data({error: verifiedToken.error}, {status: 401});
    tokenPayload = verifiedToken.payload;
  }

  const token = env?.PRIVATE_ADMIN_API_TOKEN || getBrokerToken(shop)?.accessToken || null;
  if (!token) return data({error: 'Broker is not connected to this shop (no Admin token).'}, {status: 503});

  const adminApiUrl = `https://${shop}/admin/api/2025-10/graphql.json`;

  if (operation === 'phone' || operation === 'consent' || operation === 'both') {
    if (tokenPayload?.allowPhoneCapture !== true) {
      return data({error: 'Phone/SMS capture is not allowed for this customer.', source: 'admin'}, {status: 403});
    }
  }

  const customerId = tokenPayload?.customerId;
  if (!customerId) return data({error: 'Missing customerId in signupToken.'}, {status: 400});

  if (operation === 'phone' || operation === 'both') {
    const updated = await shopifyAdminGraphql<{
      customerUpdate: {
        customer: {id: string; phone?: string | null} | null;
        userErrors: Array<{field: string[] | null; message: string}>;
      };
    }>(adminApiUrl, token, CUSTOMER_PHONE_UPDATE_MUTATION, {
      input: {
        id: customerId,
        phone: e164Phone,
      },
    });

    if (updated.customerUpdate.userErrors.length) {
      return data({error: updated.customerUpdate.userErrors[0].message, step: 'phone', source: 'admin'}, {status: 400});
    }
  }

  if (operation === 'consent' || operation === 'both') {
    const consentUpdated = await shopifyAdminGraphql<{
      customerSmsMarketingConsentUpdate: {
        customer: {id: string} | null;
        userErrors: Array<{field: string[] | null; message: string}>;
      };
    }>(adminApiUrl, token, CUSTOMER_SMS_MARKETING_CONSENT_UPDATE_MUTATION, {
      input: {
        customerId,
        smsMarketingConsent: {
          marketingState: 'SUBSCRIBED',
          marketingOptInLevel: 'SINGLE_OPT_IN',
          consentUpdatedAt: new Date().toISOString(),
        },
      },
    });

    if (consentUpdated.customerSmsMarketingConsentUpdate.userErrors.length) {
      return data({error: consentUpdated.customerSmsMarketingConsentUpdate.userErrors[0].message, step: 'smsConsent', source: 'admin'}, {status: 400});
    }
  }

  return data({success: true, source: 'admin', message: "Thank you! We'll contact you when we launch."});
}

async function shopifyAdminGraphql<TData>(
  url: string,
  accessToken: string,
  query: string,
  variables?: Record<string, any>,
): Promise<TData> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({query, variables}),
  });

  const payload = (await res.json()) as {data?: TData; errors?: Array<{message: string}>};
  if (!res.ok) throw new Error(payload.errors?.[0]?.message || `Admin API HTTP ${res.status}`);
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  if (!payload.data) throw new Error('Admin API returned no data');
  return payload.data;
}

const CUSTOMER_PHONE_UPDATE_MUTATION = `#graphql
  mutation CustomerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;

const CUSTOMER_SMS_MARKETING_CONSENT_UPDATE_MUTATION = `#graphql
  mutation CustomerSmsMarketingConsentUpdate($input: CustomerSmsMarketingConsentUpdateInput!) {
    customerSmsMarketingConsentUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;

function toE164(input: string): string | null {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length < 6 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length < 6 || digits.length > 15) return null;
  return `+${digits}`;
}

