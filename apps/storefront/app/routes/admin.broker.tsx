import {Link} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {data, useLoaderData} from 'react-router';
import {getAdminBrokerConfig, listBrokerTokenShops} from '~/lib/admin-broker.server';
import {Container} from '~/components/atoms/container';

export async function loader({context, request}: LoaderFunctionArgs) {
  const env = (context as any).env as Record<string, string | undefined> | undefined;
  const origin = new URL(request.url).origin;
  const config = getAdminBrokerConfig(env, origin);

  return data({
    enabled: config.enabled,
    shop: config.shop,
    hasClientId: Boolean(config.clientId),
    hasClientSecret: Boolean(config.clientSecret),
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    connectedShops: listBrokerTokenShops(),
  });
}

export default function AdminBrokerPage() {
  const d = useLoaderData<typeof loader>();

  return (
    <Container maxWidthClassName="max-w-2xl" className="py-10 space-y-6">
      <h1 className="text-3xl font-bold font-display">Admin Auth Broker (placeholder)</h1>
      <p className="text-muted-foreground">
        This is a deployable placeholder for a future OAuth broker. Tokens are stored in-memory for now.
      </p>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <div><strong>Enabled:</strong> {String(d.enabled)}</div>
        <div><strong>Configured shop:</strong> {d.shop ?? '(none)'}</div>
        <div><strong>Has client id:</strong> {String(d.hasClientId)}</div>
        <div><strong>Has client secret:</strong> {String(d.hasClientSecret)}</div>
        <div><strong>Redirect URI:</strong> {d.redirectUri ?? '(none)'}</div>
        <div><strong>Scopes:</strong> {d.scopes}</div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">Connect</h2>
        <p className="text-muted-foreground">
          Start OAuth for a shop. You can override the shop via a query string.
        </p>
        <div className="flex gap-3">
          <Link className="underline" to="/admin/broker/start">Start OAuth</Link>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">Connected (in-memory)</h2>
        {d.connectedShops.length ? (
          <ul className="list-disc pl-6">
            {d.connectedShops.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No connected shops.</p>
        )}
      </div>
    </Container>
  );
}

