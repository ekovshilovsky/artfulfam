import {data} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {normalizeShopDomain, setAdminAccessToken, verifyShopifyHmac} from '~/lib/admin-oauth.server';

export async function loader({context, request}: LoaderFunctionArgs) {
  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const apiKey = env?.SHOPIFY_ADMIN_API_KEY;
  const apiSecret = env?.SHOPIFY_ADMIN_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Response(
      'Missing SHOPIFY_ADMIN_API_KEY / SHOPIFY_ADMIN_API_SECRET',
      {status: 500},
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const shopParam = url.searchParams.get('shop');

  const cookieHeader = request.headers.get('cookie') || '';
  const expectedState = readCookie(cookieHeader, 'shopify_oauth_state');
  const expectedShop = readCookie(cookieHeader, 'shopify_oauth_shop');
  const shop = shopParam ? normalizeShopDomain(shopParam) : expectedShop ? normalizeShopDomain(expectedShop) : null;

  if (!code || !state || !expectedState || state !== expectedState) {
    throw new Response('Invalid OAuth state', {status: 400});
  }

  if (!shop || !expectedShop || normalizeShopDomain(expectedShop) !== shop) {
    throw new Response('OAuth shop mismatch', {status: 400});
  }

  const validHmac = await verifyShopifyHmac(url.searchParams, apiSecret);
  if (!validHmac) {
    throw new Response('Invalid OAuth HMAC', {status: 400});
  }

  const token = await exchangeCodeForToken(shop, apiKey, apiSecret, code);
  setAdminAccessToken(token, shop);

  // Clear state cookie
  const clearCookie = [
    'shopify_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
    'shopify_oauth_shop=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
  ].join(', ');

  return data(
    {
      success: true,
      message:
        'Shopify Admin connected for this running dev server. Customer + SMS updates will now be saved to Shopify.',
    },
    {headers: {'Set-Cookie': clearCookie}},
  );
}

function readCookie(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(';').map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

async function exchangeCodeForToken(shop: string, apiKey: string, apiSecret: string, code: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
  });

  const payload = (await res.json()) as {access_token?: string; scope?: string; error?: string};
  if (!res.ok || !payload.access_token) {
    throw new Response(payload.error || 'Failed to exchange OAuth code for token', {status: 400});
  }
  return payload.access_token;
}

