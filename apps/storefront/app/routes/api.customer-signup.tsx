import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getAdminAccessToken, normalizeShopDomain} from '~/lib/admin-oauth.server';
import {getBrokerSharedSecret, signBrokerRequest} from '~/lib/broker-auth.server';
import {getSignupTokenSecret, signSignupToken} from '~/lib/signup-token.server';
import {getRuntimeEnv} from '~/lib/runtime-env.server';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = (await request.json()) as {email?: string};
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return data({error: 'Invalid email address'}, {status: 400});
    }

    const env = getRuntimeEnv((context as any).env as Record<string, string | undefined> | undefined);
    const storeDomain = env?.PUBLIC_STORE_DOMAIN ? normalizeShopDomain(env.PUBLIC_STORE_DOMAIN) : undefined;
    const {accessToken: adminToken, shop: adminShop} = getAdminAccessToken(env);
    const origin = new URL(request.url).origin;
    const brokerBaseUrl = env?.BROKER_BASE_URL || origin;

    if (!storeDomain) return data({error: 'Missing PUBLIC_STORE_DOMAIN.'}, {status: 500});
    const signupTokenSecret = getSignupTokenSecret(env);
    if (!signupTokenSecret) return data({error: 'Missing SIGNUP_TOKEN_SECRET (or SESSION_SECRET).'}, {status: 500});

    const adminTargetShop = env?.ADMIN_API_SHOP
      ? normalizeShopDomain(env.ADMIN_API_SHOP)
      : storeDomain;

    // If Admin API is configured, use it (same approach as `first-version`):
    // - Search by email (Admin REST)
    // - Update existing if needed (Admin REST)
    // - Otherwise create (Admin REST)
    if (adminToken) {
      // For env-provided tokens, we must know which shop to target explicitly.
      if (!adminShop && !env?.ADMIN_API_SHOP) {
        return data(
          {error: 'Missing ADMIN_API_SHOP for Admin API requests.', source: 'admin'},
          {status: 500},
        );
      }
      const shop = adminShop || adminTargetShop;
      const apiBase = `https://${shop}/admin/api/2025-10`;
      const nowIso = new Date().toISOString();
      const sourceTag = 'af_source_admin';
      const signupTag = 'coming-soon-signup';

      try {
        const found = await shopifyAdminRest<{customers: Array<AdminRestCustomer>}>(`${apiBase}/customers/search.json?query=${encodeURIComponent(`email:${email}`)}`, adminToken);
        const existingCustomer = found.customers?.[0];

        if (existingCustomer?.id) {
          const existingTags = parseTags(existingCustomer.tags);
          const mergedTags = mergeTags(existingTags, [signupTag, sourceTag]);

          // If already subscribed + already tagged, treat as existing and don't prompt for phone.
          const consentState = existingCustomer.email_marketing_consent?.state;
          const alreadySubscribed = consentState === 'subscribed';
          const hasTagsAlready =
            existingTags.includes(signupTag) && existingTags.includes(sourceTag);

          if (!alreadySubscribed || !hasTagsAlready) {
            await shopifyAdminRest(
              `${apiBase}/customers/${existingCustomer.id}.json`,
              adminToken,
              {
                method: 'PUT',
                body: {
                  customer: {
                    id: existingCustomer.id,
                    accepts_marketing: true,
                    email_marketing_consent: {
                      state: 'subscribed',
                      opt_in_level: 'single_opt_in',
                      consent_updated_at: nowIso,
                    },
                    tags: mergedTags.join(', '),
                    note: 'Subscribed via Coming Soon (Hydrogen/Admin API)',
                  },
                },
              },
            );
          }

          const signupToken = await signSignupToken({
            secret: signupTokenSecret,
            shop: adminTargetShop,
            email,
            allowPhoneCapture: false,
          });
          return data({
            success: true,
            isNewCustomer: false,
            smsEnabled: false,
            collectPhone: false,
            signupToken,
            source: 'admin',
            message: 'Already signed up!',
          });
        }

        let createdId: number | null = null;
        try {
          const created = await shopifyAdminRest<{customer: AdminRestCustomer}>(
            `${apiBase}/customers.json`,
            adminToken,
            {
              method: 'POST',
              body: {
                customer: {
                  email,
                  accepts_marketing: true,
                  email_marketing_consent: {
                    state: 'subscribed',
                    opt_in_level: 'single_opt_in',
                    consent_updated_at: nowIso,
                  },
                  tags: [signupTag, sourceTag].join(', '),
                  note: 'Created via Coming Soon (Hydrogen/Admin API)',
                },
              },
            },
          );
          createdId = created.customer?.id ?? null;
        } catch (e: any) {
          // Race / eventual-consistency: search might not find immediately, but create will fail with 422 if email exists.
          if (Number(e?.status) === 422) {
            const signupToken = await signSignupToken({
              secret: signupTokenSecret,
              shop: adminTargetShop,
              email,
              allowPhoneCapture: false,
            });
            return data({
              success: true,
              isNewCustomer: false,
              smsEnabled: false,
              collectPhone: false,
              signupToken,
              source: 'admin',
              message: 'Already signed up!',
            });
          }
          throw e;
        }

        if (!createdId) return data({error: 'Customer was not created. Please try again.'}, {status: 502});
        const customerId = toGid(createdId);

        const signupToken = await signSignupToken({
          secret: signupTokenSecret,
          shop: adminTargetShop,
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
          source: 'admin',
          message: 'Successfully signed up!',
        });
      } catch (err: any) {
        const status = Number(err?.status || 500);
        const message = String(err?.message || 'Admin API error');
        return data({error: message, source: 'admin'}, {status});
      }
    }

    // If a broker shared secret is configured, try broker endpoint that mirrors this route.
    const brokerSecret = getBrokerSharedSecret(env);
    if (brokerSecret) {
      const body = JSON.stringify({email});
      const auth = await signBrokerRequest(brokerSecret, body, Date.now(), storeDomain);
      const brokerRes = await fetch(`${brokerBaseUrl}/admin/broker/api/customer-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Shop': storeDomain,
          ...auth,
        },
        body,
      });

      const brokerJson = await brokerRes.json();
      if (brokerRes.ok) return data(brokerJson as any, {status: 200});
      // If broker fails, fall through to other strategies
    }

    // Fallback: create a customer account via Storefront API (requires password).
    // This will show up in Shopify Customers list, but SMS consent can't be stored without Admin access.
    const storefront = (context as any).storefront;
    if (!storefront?.mutate) {
      return data({error: 'Storefront API client unavailable.'}, {status: 500});
    }

    const password = generatePassword();
    const result = await storefront.mutate(STOREFRONT_CUSTOMER_CREATE_MUTATION, {
      variables: {input: {email, password, acceptsMarketing: true}},
    });

    const customerCreate = result?.customerCreate;
    const userErrors = customerCreate?.customerUserErrors ?? [];
    if (userErrors.length) {
      const firstMessage = String(userErrors[0]?.message || '');

      // Some shops require email verification for classic customer accounts.
      // Treat this as a successful signup, since Shopify will create the customer after verification.
      if (
        firstMessage.includes('please click the link included to verify your email address') ||
        firstMessage.includes('please click the link') && firstMessage.includes('verify your email')
      ) {
        const signupToken = await signSignupToken({
          secret: signupTokenSecret,
          shop: adminTargetShop,
          email,
          allowPhoneCapture: false,
        });
        return data({
          success: true,
          isNewCustomer: true,
          smsEnabled: false,
          collectPhone: false,
          signupToken,
          source: 'storefront',
          message: firstMessage,
        });
      }

      // If already exists, treat as existing signup
      const taken = userErrors.find((e: any) => e.code === 'TAKEN');
      if (taken) {
        const signupToken = await signSignupToken({
          secret: signupTokenSecret,
          shop: adminTargetShop,
          email,
          allowPhoneCapture: false,
        });
        return data({
          success: true,
          isNewCustomer: false,
          smsEnabled: false,
          collectPhone: false,
          signupToken,
          source: 'storefront',
          message: 'Already signed up!',
        });
      }
      return data({error: userErrors[0].message || 'Failed to sign up'}, {status: 400});
    }

    if (!customerCreate?.customer?.id) {
      return data({error: 'Customer was not created. Please try again.'}, {status: 502});
    }

    const signupToken = await signSignupToken({
      secret: signupTokenSecret,
      shop: adminTargetShop,
      email,
      customerId: customerCreate.customer.id,
      allowPhoneCapture: false,
    });
    return data({
      success: true,
      isNewCustomer: true,
      smsEnabled: false,
      collectPhone: false,
      signupToken,
      customerId: customerCreate.customer.id,
      source: 'storefront',
      message: 'Successfully signed up!',
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    return data({error: 'An unexpected error occurred'}, {status: 500});
  }
}

type AdminRestCustomer = {
  id: number;
  email?: string | null;
  tags?: string | null;
  accepts_marketing?: boolean | null;
  email_marketing_consent?: {
    state?: string | null;
    opt_in_level?: string | null;
    consent_updated_at?: string | null;
  } | null;
};

async function shopifyAdminRest<TData>(
  url: string,
  accessToken: string,
  options?: {method?: string; body?: unknown},
): Promise<TData> {
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    let msg: any =
      json?.errors?.[0]?.message ||
      json?.errors ||
      json?.error ||
      (typeof json === 'string' ? json : null) ||
      text ||
      `Admin API HTTP ${res.status}`;
    if (typeof msg !== 'string') {
      try {
        msg = JSON.stringify(msg);
      } catch {
        msg = String(msg);
      }
    }
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return (json ?? {}) as TData;
}

function toGid(customerId: number): string {
  return `gid://shopify/Customer/${customerId}`;
}

function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function mergeTags(existing: string[], add: string[]): string[] {
  const set = new Set<string>(existing);
  for (const t of add) set.add(t);
  return Array.from(set);
}

const STOREFRONT_CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

function generatePassword() {
  // 24 chars, URL-safe-ish, enough entropy for a throwaway account password.
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
