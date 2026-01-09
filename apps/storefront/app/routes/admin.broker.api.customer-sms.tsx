import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getAdminBrokerConfig, getBrokerToken, normalizeShopDomain} from '~/lib/admin-broker.server';
import {getBrokerSharedSecret, verifyBrokerRequestSignature} from '~/lib/broker-auth.server';

type SmsRequestBody = {
  shop: string;
  email: string;
  phone: string;
};

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const cfg = getAdminBrokerConfig(env, new URL(request.url).origin);

  if (!cfg.enabled) {
    return data({error: 'Admin broker is disabled.'}, {status: 403});
  }

  const sharedSecret = getBrokerSharedSecret(env);
  if (!sharedSecret) {
    return data({error: 'Missing BROKER_SHARED_SECRET on broker.'}, {status: 500});
  }

  const rawBody = await request.text();
  const verified = await verifyBrokerRequestSignature({
    secret: sharedSecret,
    rawBody,
    timestampHeader: request.headers.get('X-Broker-Timestamp'),
    signatureHeader: request.headers.get('X-Broker-Signature'),
  });
  if (!verified.ok) {
    return data({error: verified.error}, {status: 401});
  }

  let body: SmsRequestBody;
  try {
    body = JSON.parse(rawBody) as SmsRequestBody;
  } catch {
    return data({error: 'Invalid JSON'}, {status: 400});
  }

  const shop = normalizeShopDomain(body.shop || cfg.shop || '');
  if (!shop) return data({error: 'Missing shop'}, {status: 400});

  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return data({error: 'Invalid email'}, {status: 400});
  }

  const digitsOnly = String(body.phone || '').replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    return data({error: 'Phone number must be a valid 10-digit US number.'}, {status: 400});
  }
  const e164Phone = `+1${digitsOnly}`;

  const token =
    env?.PRIVATE_ADMIN_API_TOKEN ||
    getBrokerToken(shop)?.accessToken ||
    null;
  if (!token) {
    return data({error: 'Broker is not connected to this shop (no Admin token).'}, {status: 503});
  }

  const adminApiUrl = `https://${shop}/admin/api/2025-10/graphql.json`;

  const existing = await shopifyAdminGraphql<{
    customers: {nodes: Array<{id: string}>};
  }>(adminApiUrl, token, CUSTOMER_BY_EMAIL_QUERY, {
    query: `email:${email}`,
  });

  const customerId = existing.customers.nodes[0]?.id;
  if (!customerId) {
    return data({error: 'Customer not found in Shopify.'}, {status: 404});
  }

  const updated = await shopifyAdminGraphql<{
    customerUpdate: {
      customer: {id: string} | null;
      userErrors: Array<{field: string[] | null; message: string}>;
    };
  }>(adminApiUrl, token, CUSTOMER_UPDATE_MUTATION, {
    input: {
      id: customerId,
      phone: e164Phone,
      smsMarketingConsent: {
        marketingState: 'SUBSCRIBED',
        marketingOptInLevel: 'SINGLE_OPT_IN',
      },
    },
  });

  if (updated.customerUpdate.userErrors.length) {
    return data({error: updated.customerUpdate.userErrors[0].message}, {status: 400});
  }

  return data({success: true});
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
  if (!res.ok) {
    throw new Error(payload.errors?.[0]?.message || `Admin API HTTP ${res.status}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  if (!payload.data) {
    throw new Error('Admin API returned no data');
  }
  return payload.data;
}

const CUSTOMER_BY_EMAIL_QUERY = `#graphql
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
      }
    }
  }
` as const;

const CUSTOMER_UPDATE_MUTATION = `#graphql
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

