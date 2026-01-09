import {redirect} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {
  getAdminBrokerConfig,
  normalizeShopDomain,
  storeBrokerToken,
  verifyShopifyHmac,
} from '~/lib/admin-broker.server';

export async function loader({context, request}: LoaderFunctionArgs) {
  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const url = new URL(request.url);
  const cfg = getAdminBrokerConfig(env, url.origin);

  if (!cfg.enabled) {
    throw new Response('Admin broker disabled.', {status: 403});
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Response('Admin broker missing client id/secret.', {status: 500});
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const shopParam = url.searchParams.get('shop');

  const cookieHeader = request.headers.get('cookie') || '';
  const expectedState = readCookie(cookieHeader, 'admin_broker_state');
  const expectedShop = readCookie(cookieHeader, 'admin_broker_shop');

  const shop = normalizeShopDomain(shopParam || expectedShop || '');
  if (!shop) throw new Response('Missing shop', {status: 400});

  if (!code || !state || !expectedState || state !== expectedState) {
    throw new Response('Invalid OAuth state', {status: 400});
  }

  if (!expectedShop || normalizeShopDomain(expectedShop) !== shop) {
    throw new Response('OAuth shop mismatch', {status: 400});
  }

  const validHmac = await verifyShopifyHmac(url.searchParams, cfg.clientSecret);
  if (!validHmac) throw new Response('Invalid OAuth HMAC', {status: 400});

  const token = await exchangeCodeForToken(shop, cfg.clientId, cfg.clientSecret, code);
  storeBrokerToken({accessToken: token.access_token, shop, createdAt: Date.now(), scope: token.scope});

  const clearCookies = [
    'admin_broker_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
    'admin_broker_shop=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
  ].join(', ');

  return redirect('/admin/broker', {headers: {'Set-Cookie': clearCookies}});
}

function readCookie(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(';').map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

async function exchangeCodeForToken(
  shop: string,
  clientId: string,
  clientSecret: string,
  code: string,
) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const payload = (await res.json()) as {access_token?: string; scope?: string; error?: string};
  if (!res.ok || !payload.access_token) {
    throw new Response(payload.error || 'Failed to exchange OAuth code for token', {status: 400});
  }
  return {access_token: payload.access_token, scope: payload.scope};
}

