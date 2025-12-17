import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getAdminAccessToken, normalizeShopDomain} from '~/lib/admin-oauth.server';
import {getBrokerSharedSecret, signBrokerRequest} from '~/lib/broker-auth.server';
import {getSignupTokenSecret, verifySignupToken} from '~/lib/signup-token.server';
import {getRuntimeEnv} from '~/lib/runtime-env.server';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      phone?: string;
      signupToken?: string;
      consent?: boolean;
      operation?: 'phone' | 'consent' | 'both';
    };
    const phone = body?.phone;
    const signupToken = body?.signupToken;
    const emailFromBody = body?.email;
    const consent = body?.consent;

    const operation = body?.operation ?? 'both';
    if (operation !== 'phone' && operation !== 'consent' && operation !== 'both') {
      return data({error: 'Invalid operation'}, {status: 400});
    }
    if (operation === 'phone' || operation === 'both') {
      if (!phone) return data({error: 'Phone is required'}, {status: 400});
    }
    if (operation === 'consent' || operation === 'both') {
      if (consent !== true) return data({error: 'SMS consent is required'}, {status: 400});
    }

    const env = getRuntimeEnv((context as any).env as Record<string, string | undefined> | undefined);
    const {accessToken: adminToken, shop: adminShop} = getAdminAccessToken(env);
    const storeDomain = env?.PUBLIC_STORE_DOMAIN ? normalizeShopDomain(env.PUBLIC_STORE_DOMAIN) : undefined;
    const origin = new URL(request.url).origin;
    const brokerBaseUrl = env?.BROKER_BASE_URL || origin;

    if (!storeDomain) return data({error: 'Missing PUBLIC_STORE_DOMAIN.'}, {status: 500});

    const signupTokenSecret = getSignupTokenSecret(env);
    if (!signupTokenSecret) {
      return data({error: 'Missing SIGNUP_TOKEN_SECRET (or SESSION_SECRET).'}, {status: 500});
    }

    const adminTargetShop = env?.ADMIN_API_SHOP
      ? normalizeShopDomain(env.ADMIN_API_SHOP)
      : storeDomain;
    if (adminToken && !adminShop && !env?.ADMIN_API_SHOP) {
      return data({error: 'Missing ADMIN_API_SHOP for Admin API requests.', source: 'admin'}, {status: 500});
    }

    let tokenPayload:
      | {shop: string; email: string; customerId?: string; allowPhoneCapture?: boolean}
      | null = null;
    if (signupToken) {
      const verifiedToken = await verifySignupToken({
        secret: signupTokenSecret,
        token: signupToken,
        expectedShop: adminTargetShop,
      });
      if (!verifiedToken.ok) return data({error: verifiedToken.error}, {status: 401});
      tokenPayload = verifiedToken.payload;
    }

    if (!adminToken) {
      const brokerSecret = getBrokerSharedSecret(env);
      if (brokerSecret) {
        const brokerBody = JSON.stringify({signupToken, email: emailFromBody, phone, consent});
        const auth = await signBrokerRequest(brokerSecret, brokerBody, Date.now(), storeDomain);
        const brokerRes = await fetch(`${brokerBaseUrl}/admin/broker/api/update-customer-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Shop': storeDomain,
            ...auth,
          },
          body: brokerBody,
        });

        const brokerJson = await brokerRes.json();
        return data(brokerJson as any, {status: brokerRes.status});
      }

      return data(
        {
          error:
            'SMS saving is not configured yet. Connect Shopify Admin first at /auth/shopify (or set PRIVATE_ADMIN_API_TOKEN).',
        },
        {status: 501},
      );
    }
    const e164Phone =
      operation === 'phone' || operation === 'both'
        ? toE164(phone || '')
        : null;
    if ((operation === 'phone' || operation === 'both') && !e164Phone) {
      return data({error: 'Phone number must be a valid E.164 phone number.'}, {status: 400});
    }

    const adminApiUrl = `https://${(adminShop || adminTargetShop)}/admin/api/2025-10/graphql.json`;

    // Security: Do not allow phone/SMS writes for existing customers.
    // Only allow when the signup flow explicitly minted a token with allowPhoneCapture=true.
    if (operation === 'phone' || operation === 'consent' || operation === 'both') {
      if (tokenPayload?.allowPhoneCapture !== true) {
        return data(
          {
            error: 'Phone/SMS capture is not allowed for this customer.',
            source: 'admin',
          },
          {status: 403},
        );
      }
    }

    const customerId = tokenPayload?.customerId;
    if (!customerId) return data({error: 'Missing customerId in signupToken.'}, {status: 400});

    // Step 1) Update phone (CustomerInput)
    if (operation === 'phone' || operation === 'both') {
      try {
        const phoneUpdated = await shopifyAdminGraphql<{
          customerUpdate: {
            customer: {id: string; phone?: string | null} | null;
            userErrors: Array<{field: string[] | null; message: string}>;
          };
        }>(adminApiUrl, adminToken, CUSTOMER_PHONE_UPDATE_MUTATION, {
          input: {
            id: customerId,
            phone: e164Phone,
          },
        });

        if (phoneUpdated.customerUpdate.userErrors.length) {
          return data(
            {
              error: phoneUpdated.customerUpdate.userErrors[0].message,
              step: 'phone',
              source: 'admin',
            },
            {status: 400},
          );
        }
      } catch (e: any) {
        const message = String(e?.message || '');
        if (message.includes('not approved to access the Customer object')) {
          return data(
            {
              error:
                'This store/app is not approved for Admin API access to Customers (protected customer data).',
              step: 'phone',
              source: 'admin',
            },
            {status: 403},
          );
        }
        return data({error: message || 'Admin API error', step: 'phone', source: 'admin'}, {status: 500});
      }
    }

    // Step 2) Update SMS marketing consent (Shopify requires a dedicated mutation)
    if (operation === 'consent' || operation === 'both') {
      try {
        const consentUpdated = await shopifyAdminGraphql<{
          customerSmsMarketingConsentUpdate: {
            customer: {id: string} | null;
            userErrors: Array<{field: string[] | null; message: string}>;
          };
        }>(adminApiUrl, adminToken, CUSTOMER_SMS_MARKETING_CONSENT_UPDATE_MUTATION, {
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
          return data(
            {
              error: consentUpdated.customerSmsMarketingConsentUpdate.userErrors[0].message,
              step: 'smsConsent',
              source: 'admin',
            },
            {status: 400},
          );
        }
      } catch (e: any) {
        const message = String(e?.message || '');
        if (message.includes('not approved to access the Customer object')) {
          return data(
            {
              error:
                'This store/app is not approved for Admin API access to Customers (protected customer data).',
              step: 'smsConsent',
              source: 'admin',
            },
            {status: 403},
          );
        }
        return data(
          {error: message || 'Admin API error', step: 'smsConsent', source: 'admin'},
          {status: 500},
        );
      }
    }

    return data({
      success: true,
      source: 'admin',
      message: 'Thank you! We\'ll contact you when we launch.',
    });
  } catch (error: any) {
    console.error('Update customer SMS error:', error);
    return data({error: 'An unexpected error occurred'}, {status: 500});
  }
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
    const error: any = new Error(payload.errors?.[0]?.message || `Admin API HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  if (payload.errors?.length) {
    const error: any = new Error(payload.errors[0].message);
    error.status = 200;
    throw error;
  }
  if (!payload.data) {
    const error: any = new Error('Admin API returned no data');
    error.status = 502;
    throw error;
  }
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

  // If user already provided +E164-ish, normalize digits.
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length < 6 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = trimmed.replace(/[^\d]/g, '');
  // US 10-digit fallback
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length < 6 || digits.length > 15) return null;
  return `+${digits}`;
}
