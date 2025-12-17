import {redirect} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {generateRandomState, getAdminBrokerConfig, normalizeShopDomain} from '~/lib/admin-broker.server';

export async function loader({context, request}: LoaderFunctionArgs) {
  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const url = new URL(request.url);
  const origin = url.origin;
  const cfg = getAdminBrokerConfig(env, origin);

  if (!cfg.enabled) {
    throw new Response('Admin broker disabled (set ADMIN_BROKER_ENABLED=true).', {status: 403});
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Response('Admin broker missing ADMIN_BROKER_CLIENT_ID/SECRET.', {status: 500});
  }
  if (!cfg.redirectUri) {
    throw new Response('Admin broker missing redirect uri.', {status: 500});
  }

  const shop = normalizeShopDomain(url.searchParams.get('shop') || cfg.shop || '');
  if (!shop) {
    throw new Response('Missing shop. Provide ?shop=example.myshopify.com or ADMIN_BROKER_SHOP.', {status: 400});
  }

  const state = await generateRandomState();
  const cookie = [
    `admin_broker_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    `admin_broker_shop=${encodeURIComponent(shop)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  ].join(', ');

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', cfg.clientId);
  authUrl.searchParams.set('scope', cfg.scopes);
  authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
  authUrl.searchParams.set('state', state);

  return redirect(authUrl.toString(), {headers: {'Set-Cookie': cookie}});
}

