import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getAdminBrokerConfig, getBrokerToken, normalizeShopDomain} from '~/lib/admin-broker.server';
import {getBrokerSharedSecret, verifyBrokerRequestSignature} from '~/lib/broker-auth.server';
import {getSignupTokenSecret, signSignupToken} from '~/lib/signup-token.server';
import {getRuntimeEnv} from '~/lib/runtime-env.server';

// Mirrors /api/customer-signup (same JSON shape)
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

  let body: {email?: string};
  try {
    body = JSON.parse(rawBody) as {email?: string};
  } catch {
    return data({error: 'Invalid JSON'}, {status: 400});
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return data({error: 'Invalid email address'}, {status: 400});
  }

  const shop = normalizeShopDomain(shopHeader || cfg.shop || '');
  if (!shop) return data({error: 'Missing shop'}, {status: 400});

  const token = env?.PRIVATE_ADMIN_API_TOKEN || getBrokerToken(shop)?.accessToken || null;
  if (!token) return data({error: 'Broker is not connected to this shop (no Admin token).'}, {status: 503});
  const signupTokenSecret = getSignupTokenSecret(env);
  if (!signupTokenSecret) return data({error: 'Missing SIGNUP_TOKEN_SECRET (or BROKER_SHARED_SECRET).'}, {status: 500});

  const adminApiUrl = `https://${shop}/admin/api/2025-10/graphql.json`;

  const existing = await shopifyAdminGraphql<{
    customers: {nodes: Array<{id: string; email: string}>};
  }>(adminApiUrl, token, CUSTOMER_BY_EMAIL_QUERY, {
    query: `email:${email}`,
  });

  const existingCustomer = existing.customers.nodes[0];
  if (existingCustomer) {
    const signupToken = await signSignupToken({
      secret: signupTokenSecret,
      shop,
      email,
      allowPhoneCapture: false,
    });
    return data({
      success: true,
      isNewCustomer: false,
      smsEnabled: false,
      collectPhone: false,
      signupToken,
      message: 'Already signed up!',
    });
  }

  const created = await shopifyAdminGraphql<{
    customerCreate: {
      customer: {id: string; email: string} | null;
      userErrors: Array<{field: string[] | null; message: string}>;
    };
  }>(adminApiUrl, token, CUSTOMER_CREATE_MUTATION, {
    input: {
      email,
      emailMarketingConsent: {
        marketingState: 'SUBSCRIBED',
        marketingOptInLevel: 'SINGLE_OPT_IN',
      },
      tags: ['coming-soon'],
    },
  });

  if (created.customerCreate.userErrors.length) {
    return data({error: created.customerCreate.userErrors[0].message}, {status: 400});
  }

  const customerId = created.customerCreate.customer?.id;
  if (!customerId) return data({error: 'Customer was not created'}, {status: 502});

  const signupToken = await signSignupToken({
    secret: signupTokenSecret,
    shop,
    email,
    customerId,
    allowPhoneCapture: true,
  });
  return data({
    success: true,
    isNewCustomer: true,
    smsEnabled: true,
    collectPhone: true,
    signupToken,
    customerId,
    message: 'Successfully signed up!',
  });
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

const CUSTOMER_BY_EMAIL_QUERY = `#graphql
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        email
      }
    }
  }
` as const;

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation CustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;

