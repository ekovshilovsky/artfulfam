import {data} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getAdminAccessToken} from '~/lib/admin-oauth.server';

export async function loader({context}: LoaderFunctionArgs) {
  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const token = getAdminAccessToken(env);

  return data({
    connected: Boolean(token.accessToken),
    source: token.source,
    shop: token.shop,
    note:
      'If source is "memory", connection lasts only until the dev server restarts.',
  });
}

