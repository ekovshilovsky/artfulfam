import {defineConfig, loadEnv} from 'vite';
import {reactRouter} from '@react-router/dev/vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({mode}) => {
  // Load all env vars from `.env*` files for local dev configuration.
  // We will explicitly inject only the server-side ones MiniOxygen needs.
  const env = loadEnv(mode, process.cwd(), '');
  const injectedEnv: Record<string, string> = {};

  function add(key: string, value: string | undefined) {
    if (value !== undefined && value !== '') injectedEnv[key] = value;
  }

  add('ADMIN_API_SHOP', env.ADMIN_API_SHOP);
  add('PRIVATE_ADMIN_API_TOKEN', env.PRIVATE_ADMIN_API_TOKEN);
  add('SIGNUP_TOKEN_SECRET', env.SIGNUP_TOKEN_SECRET);

  // Broker (optional)
  add('BROKER_SHARED_SECRET', env.BROKER_SHARED_SECRET);
  add('BROKER_BASE_URL', env.BROKER_BASE_URL);
  add('ADMIN_BROKER_ENABLED', env.ADMIN_BROKER_ENABLED);
  add('ADMIN_BROKER_SHOP', env.ADMIN_BROKER_SHOP);
  add('SHOPIFY_ADMIN_API_KEY', env.SHOPIFY_ADMIN_API_KEY);
  add('SHOPIFY_ADMIN_API_SECRET', env.SHOPIFY_ADMIN_API_SECRET);
  add('SHOPIFY_ADMIN_SCOPES', env.SHOPIFY_ADMIN_SCOPES);
  add('SHOPIFY_ADMIN_REDIRECT_URI', env.SHOPIFY_ADMIN_REDIRECT_URI);
  add('SHOPIFY_ADMIN_SHOP', env.SHOPIFY_ADMIN_SHOP);

  return {
    ssr: {
      optimizeDeps: {
        include: [
          'react',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'react-dom',
          'react-dom/server',
          'react-dom/server.browser',
          'react-router',
        ],
      },
    },
    plugins: [
      hydrogen(),
      oxygen({
        // Inject server-only env vars for local dev worker runtime (context.env).
        // This does NOT expose them to the browser unless you explicitly pass them into loader data.
        env: injectedEnv,
      }),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
