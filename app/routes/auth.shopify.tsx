import {redirect} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {generateRandomState, normalizeShopDomain} from '~/lib/admin-oauth.server';

/**
 * Starts Shopify Admin OAuth for a custom app.
 *
 * Requires:
 * - SHOPIFY_ADMIN_API_KEY
 * - SHOPIFY_ADMIN_API_SECRET
 *
 * Optional:
 * - SHOPIFY_ADMIN_SCOPES (comma-separated)
 */
export async function loader({context, request}: LoaderFunctionArgs) {
  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const apiKey = env?.SHOPIFY_ADMIN_API_KEY;
  const url = new URL(request.url);
  const shop =
    normalizeShopDomain(
      url.searchParams.get('shop') ||
        env?.SHOPIFY_ADMIN_SHOP ||
        env?.PUBLIC_STORE_DOMAIN ||
        '',
    ) || undefined;

  if (!apiKey || !shop) {
    throw new Response('Missing SHOPIFY_ADMIN_API_KEY or PUBLIC_STORE_DOMAIN', {status: 500});
  }

  const scopes = env?.SHOPIFY_ADMIN_SCOPES || 'write_customers,read_customers';
  const state = await generateRandomState();
  const redirectUri =
    env?.SHOPIFY_ADMIN_REDIRECT_URI ||
    `${url.origin}/auth/shopify/callback`;

  // Store state in a short-lived cookie (simple, local/dev friendly)
  const cookie = [
    `shopify_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    `shopify_oauth_shop=${encodeURIComponent(shop)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  ].join(', ');

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', apiKey);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return redirect(authUrl.toString(), {
    headers: {
      'Set-Cookie': cookie,
    },
  });
}

