# Hydrogen upgrade guide: 2023.7.2 to 2025.7.0

----

## Breaking changes

### Migrate to React Router 7.9.x [#3141](https://github.com/Shopify/hydrogen/pull/3141)

#### Step: 1. Run the automated migration codemod [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> This codemod will automatically update most imports and references from Remix to React Router
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
npx codemod@latest remix/2/react-router/upgrade
```


#### Step: 2. Create react-router.config.ts with hydrogenPreset [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Create your React Router configuration file using Hydrogen's optimized preset. This enhances routing and build performance.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```typescript
// react-router.config.ts
import type {Config} from "@react-router/dev/config";
import {hydrogenPreset} from "@shopify/hydrogen/react-router-preset";

export default {
  presets: [hydrogenPreset()],
} satisfies Config;
```


#### Step: 3. Update vite.config.ts to use React Router plugin [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Replace the Remix Vite plugin with React Router's plugin. Add vite-tsconfig-paths for better path resolution.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
// vite.config.ts
import {defineConfig} from 'vite';
- import {vitePlugin as remix} from '@remix-run/dev';
+ import {reactRouter} from '@react-router/dev/vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
+ import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
+   hydrogen(),
+   oxygen(),
+   reactRouter(),
+   tsconfigPaths()
-   remix({
-     presets: [hydrogen.preset()],
-   }),
  ],
});
```


#### Step: 4. Update tsconfig.json for React Router type generation [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Update your TypeScript configuration to include React Router's generated types. This optimizes type checking.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
// tsconfig.json
{
  "include": [
    "env.d.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
+   "app/**/*.d.ts",
+   "*.ts",
+   "*.tsx",
+   "*.d.ts",
+   ".graphqlrc.ts",
+   ".react-router/types/**/*"
-   "**/*.ts",
-   "**/*.tsx"
  ],
  "compilerOptions": {
    "types": [
      "@shopify/oxygen-workers-types",
+     "react-router",
+     "@shopify/hydrogen/react-router-types",
+     "vite/client"
-     "@remix-run/node",
-     "vite/client"
    ],
+   "rootDirs": [".", "./.react-router/types"],
    "baseUrl": ".",
    "paths": {
      "~/*": ["app/*"]
    }
  }
}
```


#### Step: 5. Create app/lib/context.ts with createHydrogenRouterContext [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Create a new context file that exports the createHydrogenRouterContext function. This supports additional context properties and type augmentation.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```typescript
// app/lib/context.ts
import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';

const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
} as const;

type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}

export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}
```


#### Step: 6. Update server.ts to use createHydrogenRouterContext [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Replace @shopify/remix-oxygen with @shopify/hydrogen/oxygen. Use the new context creation function with session handling.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
// server.ts
- import {createRequestHandler} from "@shopify/remix-oxygen";
+ import {createRequestHandler} from "@shopify/hydrogen/oxygen";
+ import {createHydrogenRouterContext} from "~/lib/context";

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
+   const hydrogenContext = await createHydrogenRouterContext(
+     request,
+     env,
+     executionContext,
+   );

    const handleRequest = createRequestHandler({
-     build: await import('virtual:remix/server-build'),
+     build: await import('virtual:react-router/server-build'),
      mode: process.env.NODE_ENV,
-     getLoadContext: () => ({...}),
+     getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);
+
+   if (hydrogenContext.session.isPending) {
+     response.headers.set('Set-Cookie', await hydrogenContext.session.commit());
+   }

    return response;
  }
};
```


#### Step: 7. Update entry.server.tsx with new context types [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Replace Remix types with React Router types. Use HydrogenRouterContextProvider for better type safety.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
// app/entry.server.tsx
- import type {AppLoadContext} from "@shopify/remix-oxygen";
- import type {EntryContext} from "@remix-run/server-runtime";
+ import type {EntryContext} from "react-router";
import {
  createContentSecurityPolicy,
+ type HydrogenRouterContextProvider,
} from "@shopify/hydrogen";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
- remixContext: EntryContext,
+ reactRouterContext: EntryContext,
- context: AppLoadContext,
+ context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({...});

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
-       context={remixContext}
+       context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
  );
}
```


#### Step: 8. Update entry.client.tsx with NonceProvider and HydratedRouter [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Replace RemixBrowser with HydratedRouter. Wrap with NonceProvider for CSP support during client-side hydration.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
// app/entry.client.tsx
- import {RemixBrowser} from "@remix-run/react";
+ import {HydratedRouter} from "react-router/dom";
import {startTransition, StrictMode} from "react";
import {hydrateRoot} from "react-dom/client";
+ import {NonceProvider} from "@shopify/hydrogen";

if (!window.location.origin.includes("webcache.googleusercontent.com")) {
  startTransition(() => {
+   const existingNonce = document
+     .querySelector<HTMLScriptElement>("script[nonce]")
+     ?.nonce;
+
    hydrateRoot(
      document,
      <StrictMode>
-       <RemixBrowser />
+       <NonceProvider value={existingNonce}>
+         <HydratedRouter />
+       </NonceProvider>
      </StrictMode>,
    );
  });
}
```


#### Step: 9. Update @shopify/remix-oxygen imports in route files [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Replace @shopify/remix-oxygen imports with react-router equivalents in your routes
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
- import {redirect, type LoaderFunctionArgs} from "@shopify/remix-oxygen";
+ import {redirect} from "react-router";
+ import type {LoaderFunctionArgs} from "@shopify/hydrogen/oxygen";
```


#### Step: 10. Update @remix-run/react imports in route files [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Replace @remix-run/react imports with react-router equivalents in your routes
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
- import {useLoaderData, type MetaFunction} from "@remix-run/react";
+ import {useLoaderData} from "react-router";
```


#### Step: 11. Add React Router 7 route type imports [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Import route-specific types from React Router 7's new type generation system
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
+ import type {Route} from "./+types/route-name";
```


#### Step: 12. Add .react-router to .gitignore [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> React Router 7 generates type files that should not be committed to version control
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
echo ".react-router/" >> .gitignore
```


#### Step: 13. Update package.json scripts to use react-router typegen [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Add React Router type generation to your dev script. This automatically updates types during development.
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
- "dev": "shopify hydrogen dev --codegen",
+ "dev": "react-router typegen --watch && shopify hydrogen dev --codegen",
```


#### Step: 14. Verify your app starts and builds correctly [#3141](https://github.com/Shopify/hydrogen/pull/3141)

> Test that your application runs without errors after the migration
[#3141](https://github.com/Shopify/hydrogen/pull/3141)
```diff
npm run dev
npm run build
```


### The Codegen feature is now considered stable and related dependencies have been updated [#1108](https://github.com/Shopify/hydrogen/pull/1108)

#### Step: 1. Update the `dev` script [#1108](https://github.com/Shopify/hydrogen/pull/1108)

[#1108](https://github.com/Shopify/hydrogen/pull/1108)
// package.json

```diff
"scripts": {
     //......
-     "dev": "shopify hydrogen dev --codegen-unstable",
+    "dev": "shopify hydrogen dev --codegen",
}
```

#### Step: 2. Update the `codegen` script [#1108](https://github.com/Shopify/hydrogen/pull/1108)

[#1108](https://github.com/Shopify/hydrogen/pull/1108)
// package.json

```diff
"scripts": {
     //......
-    "codegen": "shopify hydrogen codegen-unstable",
+   "codegen": "shopify hydrogen codegen"
}
```

### The Storefront API types included are now generated using @graphql-codegen/typescript@4 [#1108](https://github.com/Shopify/hydrogen/pull/1108)

#### This results in a breaking change if you were importing `Scalars` directly from `@shopify/hydrogen-react` or `@shopify/hydrogen`
[docs](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/typescript/typescript/CHANGELOG.md#400)
[#1108](https://github.com/Shopify/hydrogen/pull/1108)
// all instances of `Scalars` imports

```diff
import type {Scalars} from '@shopify/hydrogen/storefront-api-types';

type Props = {
-  id: Scalars['ID']; // This was a string
+  id: Scalars['ID']['input']; // Need to access 'input' or 'output' to get the string
 };
```

### Support Hot Module Replacement (HMR) and Hot Data Revalidation (HDR) [#1187](https://github.com/Shopify/hydrogen/pull/1187)

#### Step: 1. Enable the v2 dev server in remix.config.js [#1187](https://github.com/Shopify/hydrogen/pull/1187)

[#1187](https://github.com/Shopify/hydrogen/pull/1187)
```diff
future: {
+ v2_dev: true,
  v2_meta: true,
  v2_headers: true,
  // ...
}
```

#### Step: 2. Add Remix `<LiveReload />` component if you don't have it to your `root.jsx` or `root.tsx` file [#1187](https://github.com/Shopify/hydrogen/pull/1187)

[#1187](https://github.com/Shopify/hydrogen/pull/1187)
```diff
import {
  Outlet,
  Scripts,
+ LiveReload,
  ScrollRestoration,
} from '@remix-run/react';

// ...

export default function App() {
  // ...
  return (
    <html>
      <head>
       {/* ...  */}
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
+       <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  // ...
  return (
    <html>
      <head>
        {/* ... */}
      </head>
      <body>
        Error!
        <Scripts />
+       <LiveReload />
      </body>
    </html>
  );
}
```

----

## Features

### Add countryCode parameter to Customer Account API methods [#3148](https://github.com/Shopify/hydrogen/pull/3148)

#### Add countryCode parameter to Customer Account API method calls
> Pass the customer account country code to any Customer Account API method. See login method example.
[#3148](https://github.com/Shopify/hydrogen/pull/3148)
```diff
// app/routes/account_.login.tsx (example)
export async function loader({request, context}: Route.LoaderArgs) {
  return context.customerAccount.login({
+   countryCode: context.customerAccount.i18n.country,
  });
}

// The countryCode parameter is now available on all Customer Account API methods
// and can be passed from context.customerAccount.i18n.country
```


### Remove individual gift cards from cart [#3128](https://github.com/Shopify/hydrogen/pull/3128)

#### Step: 1. Add GiftCardCodesRemove case to cart action handler [#3128](https://github.com/Shopify/hydrogen/pull/3128)

> Handle the new GiftCardCodesRemove action in your cart route. This enables individual gift card removal.
[#3128](https://github.com/Shopify/hydrogen/pull/3128)
```diff
// app/routes/cart.tsx
export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  switch (action) {
    // ... existing cases ...
+   case CartForm.ACTIONS.GiftCardCodesRemove: {
+     const appliedGiftCardIds = inputs.giftCardCodes as string[];
+     result = await cart.removeGiftCardCodes(appliedGiftCardIds);
+     break;
+   }
  }
}
```


#### Step: 2. Add RemoveGiftCardForm component [#3128](https://github.com/Shopify/hydrogen/pull/3128)

> Create a new form component to handle individual gift card removal
[#3128](https://github.com/Shopify/hydrogen/pull/3128)
```diff
// app/components/CartSummary.tsx
+function RemoveGiftCardForm({
+  giftCardId,
+  children,
+}: {
+  giftCardId: string;
+  children: React.ReactNode;
+}) {
+  return (
+    <CartForm
+      route="/cart"
+      action={CartForm.ACTIONS.GiftCardCodesRemove}
+      inputs={{
+        giftCardCodes: [giftCardId],
+      }}
+    >
+      {children}
+    </CartForm>
+  );
+}
```


#### Step: 3. Update CartGiftCard to display gift cards with remove buttons [#3128](https://github.com/Shopify/hydrogen/pull/3128)

> Render applied gift cards with individual remove buttons. This improves user experience.
[#3128](https://github.com/Shopify/hydrogen/pull/3128)
```diff
// app/components/CartSummary.tsx
function CartGiftCard({giftCardCodes}: {...}) {
  return (
    <div>
+     {giftCardCodes && giftCardCodes.length > 0 && (
+       <dl>
+         <dt>Applied Gift Card(s)</dt>
+         {giftCardCodes.map((giftCard) => (
+           <RemoveGiftCardForm key={giftCard.id} giftCardId={giftCard.id}>
+             <div className="cart-discount">
+               <code>***{giftCard.lastCharacters}</code>
+               <Money data={giftCard.amountUsed} />
+               <button type="submit">Remove</button>
+             </div>
+           </RemoveGiftCardForm>
+         ))}
+       </dl>
+     )}
    </div>
  );
}
```


### Filter customer orders by number and confirmation [#3125](https://github.com/Shopify/hydrogen/pull/3125)

#### Step: 1. Create app/lib/orderFilters.ts utility [#3125](https://github.com/Shopify/hydrogen/pull/3125)

> Create helper functions to parse URL parameters and build Customer Account API search queries.
[#3125](https://github.com/Shopify/hydrogen/pull/3125)
```typescript
// app/lib/orderFilters.ts
export const ORDER_FILTER_FIELDS = {
  NAME: 'name',
  CONFIRMATION_NUMBER: 'confirmation_number',
} as const;

export interface OrderFilterParams {
  name?: string;
  confirmationNumber?: string;
}

function sanitizeFilterValue(value: string): string {
  return value.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function buildOrderSearchQuery(
  filters: OrderFilterParams,
): string | undefined {
  const queryParts: string[] = [];

  if (filters.name) {
    const cleanName = filters.name.replace(/^#/, '').trim();
    const sanitizedName = sanitizeFilterValue(cleanName);
    if (sanitizedName) {
      queryParts.push(`name:${sanitizedName}`);
    }
  }

  if (filters.confirmationNumber) {
    const cleanConfirmation = filters.confirmationNumber.trim();
    const sanitizedConfirmation = sanitizeFilterValue(cleanConfirmation);
    if (sanitizedConfirmation) {
      queryParts.push(`confirmation_number:${sanitizedConfirmation}`);
    }
  }

  return queryParts.length > 0 ? queryParts.join(' AND ') : undefined;
}

export function parseOrderFilters(
  searchParams: URLSearchParams,
): OrderFilterParams {
  const filters: OrderFilterParams = {};

  const name = searchParams.get(ORDER_FILTER_FIELDS.NAME);
  if (name) filters.name = name;

  const confirmationNumber = searchParams.get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER);
  if (confirmationNumber) filters.confirmationNumber = confirmationNumber;

  return filters;
}
```


#### Step: 2. Update loader to parse filters and build search query [#3125](https://github.com/Shopify/hydrogen/pull/3125)

> Parse URL search parameters and build the Customer Account API query string.
[#3125](https://github.com/Shopify/hydrogen/pull/3125)
```diff
// app/routes/account.orders._index.tsx
+import {
+  buildOrderSearchQuery,
+  parseOrderFilters,
+  type OrderFilterParams,
+} from '~/lib/orderFilters';

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

+ const url = new URL(request.url);
+ const filters = parseOrderFilters(url.searchParams);
+ const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
+     query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

- return {customer: data.customer};
+ return {customer: data.customer, filters};
}
```


#### Step: 3. Add OrderSearchForm component [#3125](https://github.com/Shopify/hydrogen/pull/3125)

> Create a search form with order number and confirmation number inputs
[#3125](https://github.com/Shopify/hydrogen/pull/3125)
```diff
// app/routes/account.orders._index.tsx
+import {useSearchParams, useNavigation} from 'react-router';
+import {useRef} from 'react';
+import {ORDER_FILTER_FIELDS} from '~/lib/orderFilters';

+function OrderSearchForm({currentFilters}: {currentFilters: OrderFilterParams}) {
+  const [searchParams, setSearchParams] = useSearchParams();
+  const navigation = useNavigation();
+  const isSearching = navigation.state !== 'idle' && navigation.location?.pathname?.includes('orders');
+  const formRef = useRef<HTMLFormElement>(null);
+
+  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
+    event.preventDefault();
+    const formData = new FormData(event.currentTarget);
+    const params = new URLSearchParams();
+
+    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
+    const confirmationNumber = formData.get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)?.toString().trim();
+
+    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
+    if (confirmationNumber) params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);
+
+    setSearchParams(params);
+  };
+
+  return (
+    <form ref={formRef} onSubmit={handleSubmit}>
+      <input type="search" name={ORDER_FILTER_FIELDS.NAME} placeholder="Order #" defaultValue={currentFilters.name || ''} />
+      <input type="search" name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER} placeholder="Confirmation #" defaultValue={currentFilters.confirmationNumber || ''} />
+      <button type="submit" disabled={isSearching}>{isSearching ? 'Searching' : 'Search'}</button>
+    </form>
+  );
+}
```


#### Step: 4. Update Orders component to use filters and add EmptyOrders [#3125](https://github.com/Shopify/hydrogen/pull/3125)

> Pass filters to components and add conditional empty state messaging.
[#3125](https://github.com/Shopify/hydrogen/pull/3125)
```diff
// app/routes/account.orders._index.tsx
export default function Orders() {
- const {customer} = useLoaderData<OrdersLoaderData>();
+ const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;

  return (
    <div className="orders">
+     <OrderSearchForm currentFilters={filters} />
-     <OrdersTable orders={orders} />
+     <OrdersTable orders={orders} filters={filters} />
    </div>
  );
}

-function OrdersTable({orders}: {orders: CustomerOrdersFragment['orders']}) {
+function OrdersTable({orders, filters}: {orders: CustomerOrdersFragment['orders']; filters: OrderFilterParams}) {
+  const hasFilters = !!(filters.name || filters.confirmationNumber);
+
  return (
    <div>
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders}>
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
-       <p>You haven't placed any orders yet.</p>
+       <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

+function EmptyOrders({hasFilters}: {hasFilters?: boolean}) {
+  return hasFilters ? (
+    <p>No orders found matching your search. <Link to="/account/orders">Clear filters</Link></p>
+  ) : (
+    <p>You haven't placed any orders yet.</p>
+  );
+}
```


### Get order fulfillment status from Customer Account API [#3039-fulfillment](https://github.com/Shopify/hydrogen/pull/3039)

#### Add fulfillmentStatus field to Order fragment
> Include fulfillmentStatus in your Customer Account API order queries.
[#3039-fulfillment](https://github.com/Shopify/hydrogen/pull/3039)
```diff
// app/graphql/customer-account/CustomerOrderQuery.ts
fragment Order on Order {
  id
  name
  confirmationNumber
  statusPageUrl
+ fulfillmentStatus
  processedAt
  fulfillments(first: 1) {
    nodes {
      status
    }
  }
}
```


### Use language context in Customer Account API mutations [#3039-incontext](https://github.com/Shopify/hydrogen/pull/3039)

#### Add @inContext directive to all Customer Account API operations
> Add $language parameter and @inContext directive to your queries and mutations for localized content.
[#3039-incontext](https://github.com/Shopify/hydrogen/pull/3039)
```diff
// app/graphql/customer-account/*.ts (apply to all queries and mutations)
// Example: CustomerDetailsQuery.ts
- query CustomerDetails {
+ query CustomerDetails($language: LanguageCode) @inContext(language: $language) {
    customer {
      ...Customer
    }
  }

// Example: CustomerAddressMutations.ts  
  mutation CustomerAddressUpdate(
    $address: MailingAddressInput!
    $addressId: ID!
    $defaultAddress: Boolean
+   $language: LanguageCode
- ) {
+ ) @inContext(language: $language) {
    customerAddressUpdate(...)
  }

// Apply this pattern to all Customer Account API queries and mutations:
// - CustomerDetailsQuery.ts
// - CustomerOrderQuery.ts
// - CustomerOrdersQuery.ts
// - CustomerUpdateMutation.ts
// - CustomerAddressMutations.ts (all 3 mutations)
```


### Defer non-critical fields with GraphQL @defer directive [#2993](https://github.com/Shopify/hydrogen/pull/2993)

#### Use @defer directive in Storefront API queries
> Wrap non-critical fields with @defer. This improves initial page load performance.
[#2993](https://github.com/Shopify/hydrogen/pull/2993)
```diff
// app/routes/your-route.tsx (example)
+import {LoaderFunctionArgs, useLoaderData} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  const data = await context.storefront.query(
    `
  query ProductQuery($handle: String) {
    product(handle: $handle) {
      id
      handle
+     ... @defer(label: "deferredFields") {
+       title
+       description
+     }
    }
  }
`,
    {
      variables: {
        handle: 'v2-snowboard',
      },
    },
  );
  return data;
}

// The @defer directive allows you to defer loading of non-critical fields
// improving initial page load performance
```


### Add support for `v3_routeConfig` future flag. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

#### Step: 1. Update your `vite.config.ts`. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

[docs](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)
[#2722](https://github.com/Shopify/hydrogen/pull/2722)
export default defineConfig({
 plugins: [
   hydrogen(),
   oxygen(),
   remix({
     presets: [hydrogen.v3preset()],  // Update this to hydrogen.v3preset()
     future: {
       v3_fetcherPersist: true,
       v3_relativeSplatPath: true,
       v3_throwAbortReason: true,
       v3_lazyRouteDiscovery: true,
       v3_singleFetch: true,
       v3_routeConfig: true, // add this flag
     },
   }),
   tsconfigPaths(),
 ],

#### Step: 2. Update your `package.json` and install the new packages. Make sure to match the Remix version along with other Remix npm packages and ensure the versions are 2.16.1 or above. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

[docs](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)
[#2722](https://github.com/Shopify/hydrogen/pull/2722)
"devDependencies": {
  ...
  "@remix-run/fs-routes": "^2.16.1",
  "@remix-run/route-config": "^2.16.1",

#### Step: 3. Add a `routes.ts` file. This is your new Remix route configuration file. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

[docs](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)
[#2722](https://github.com/Shopify/hydrogen/pull/2722)
import {flatRoutes} from '@remix-run/fs-routes';
import {type RouteConfig} from '@remix-run/route-config';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([
  ...(await flatRoutes()),
  // Manual route definitions can be added to this array, in addition to or instead of using the `flatRoutes` file-based routing convention.
  // See https://remix.run/docs/en/main/guides/routing for more details
]) satisfies RouteConfig;

### Enable Remix `v3_singleFetch` future flag [#2708](https://github.com/Shopify/hydrogen/pull/2708)

#### Step: 1. In your `vite.config.ts`, add the single fetch future flag [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+  declare module "@remix-run/server-runtime" {
+    interface Future {
+     v3_singleFetch: true;
+    }
+  }

  export default defineConfig({
    plugins: [
      hydrogen(),
      oxygen(),
      remix({
        presets: [hydrogen.preset()],
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
+         v3_singleFetch: true,
        },
      }),
      tsconfigPaths(),
    ],
```

#### Step: 2. In your `entry.server.tsx`, add `nonce` to the `<RemixServer>` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
const body = await renderToReadableStream(
 <NonceProvider>
   <RemixServer
     context={remixContext}
     url={request.url}
+     nonce={nonce}
   />
 </NonceProvider>,
```

#### Step: 3. Update the shouldRevalidate function in root.tsx [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
-  defaultShouldRevalidate,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

-  return defaultShouldRevalidate;
+  return false;
};
```

#### Step: 4. Update `cart.tsx` to add a headers export and update to `data` import usage [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
    import {
  -  json,
  +  data,
      type LoaderFunctionArgs,
      type ActionFunctionArgs,
      type HeadersFunction
    } from '@shopify/remix-oxygen';
  + export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

    export async function action({request, context}: ActionFunctionArgs) {
      ...
  -   return json(
  +   return data(
        {
          cart: cartResult,
          errors,
          warnings,
          analytics: {
            cartId,
          },
        },
        {status, headers},
      );
    }

    export async function loader({context}: LoaderFunctionArgs) {
      const {cart} = context;
 -    return json(await cart.get());
 +    return await cart.get();
    }
 ```

#### Step: 5. Deprecate `json` and `defer` import usage from `@shopify/remix-oxygen` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
- import {json} from "@shopify/remix-oxygen";

  export async function loader({}: LoaderFunctionArgs) {
    let tasks = await fetchTasks();
-   return json(tasks);
+   return tasks;
  }
```

```diff
- import {defer} from "@shopify/remix-oxygen";

  export async function loader({}: LoaderFunctionArgs) {
    let lazyStuff = fetchLazyStuff();
    let tasks = await fetchTasks();
-   return defer({ tasks, lazyStuff });
+   return { tasks, lazyStuff };
  }
```


#### Step: 6. If you were using the second parameter of json/defer to set a custom status or headers on your response, you can continue doing so via the new data API: [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
-  import {json} from "@shopify/remix-oxygen";
+  import {data, type HeadersFunction} from "@shopify/remix-oxygen";

+  /**
+   * If your loader or action is returning a response with headers,
+   * make sure to export a headers function that merges your headers
+   * on your route. Otherwise, your headers may be lost.
+   * Remix doc: https://remix.run/docs/en/main/route/headers
+   **/
+  export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;

  export async function loader({}: LoaderFunctionArgs) {
    let tasks = await fetchTasks();
-    return json(tasks, {
+    return data(tasks, {
      headers: {
        "Cache-Control": "public, max-age=604800"
      }
    });
  }
```


#### Step: 7. If you are using legacy customer account flow or multipass, there are a couple more files that requires updating: [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+ export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;
```


#### Step: 8. In `routes/account_.register.tsx`, add a `headers` export for `actionHeaders` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+ export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
```


#### Step: 9. If you are using multipass, in `routes/account_.login.multipass.tsx` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+ export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
```


#### Step: 10. Update all `json` response wrapper to `remixData` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
import {
- json,
+ data as remixData,
} from '@shopify/remix-oxygen';

-  return json(
+  return remixData(
    ...
  );
```

### B2B methods and props are now stable [#2736](https://github.com/Shopify/hydrogen/pull/2736)

#### Step: 1. Search for anywhere using `UNSTABLE_getBuyer` and `UNSTABLE_setBuyer` is update accordingly [#2736](https://github.com/Shopify/hydrogen/pull/2736)

[#2736](https://github.com/Shopify/hydrogen/pull/2736)
```diff
- customerAccount.UNSTABLE_getBuyer();
+ customerAccount.getBuyer()

- customerAccount.UNSTABLE_setBuyer({
+ customerAccount.setBuyer({
    companyLocationId,
  });
```

#### Step: 2. Update `createHydrogenContext` to remove the `unstableB2b` option [#2736](https://github.com/Shopify/hydrogen/pull/2736)

[#2736](https://github.com/Shopify/hydrogen/pull/2736)
```diff
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: {language: 'EN', country: 'US'},
-    customerAccount: {
-      unstableB2b: true,
-    },
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });
```

### Add `language` support to `createCustomerAccountClient` and `createHydrogenContext` [#2746](https://github.com/Shopify/hydrogen/pull/2746)

#### Step: 1. If present, the provided `language` will be used to set the `uilocales` property in the Customer Account API request. This will allow the API to return localized data for the provided language. [#2746](https://github.com/Shopify/hydrogen/pull/2746)

[#2746](https://github.com/Shopify/hydrogen/pull/2746)
```ts
// Optional: provide language data to the constructor
const customerAccount = createCustomerAccountClient({
  // ...
  language,
});
```

#### Step: 2. Calls to `login()` will use the provided `language` without having to pass it explicitly via `uiLocales`; however, if the `login()` method is already using its `uilocales` property, the `language` parameter coming from the context/constructor will be ignored. If nothing is explicitly passed, `login()` will default to `context.i18n.language`. [#2746](https://github.com/Shopify/hydrogen/pull/2746)

[#2746](https://github.com/Shopify/hydrogen/pull/2746)
```ts
export async function loader({request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login({
    uiLocales: 'FR', // will be used instead of the one coming from the context
  });
}
```

### Turn on Remix future flag v3_lazyRouteDiscovery [#2702](https://github.com/Shopify/hydrogen/pull/2702)

#### Add the following line to your vite.config.ts and test your app.
[#2702](https://github.com/Shopify/hydrogen/pull/2702)
```diff
export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      presets: [hydrogen.preset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
+        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
```

### Stabilize getSitemap, getSitemapIndex and implement on skeleton [#2589](https://github.com/Shopify/hydrogen/pull/2589)

#### Step: 1. Update the getSitemapIndex at /app/routes/[sitemap.xml].tsx [#2589](https://github.com/Shopify/hydrogen/pull/2589)

[#2589](https://github.com/Shopify/hydrogen/pull/2589)
```diff
- import {unstable__getSitemapIndex as getSitemapIndex} from '@shopify/hydrogen';
+ import {getSitemapIndex} from '@shopify/hydrogen';
```


#### Step: 2. Update the getSitemap at /app/routes/sitemap.$type.$page[.xml].tsx [#2589](https://github.com/Shopify/hydrogen/pull/2589)

[#2589](https://github.com/Shopify/hydrogen/pull/2589)
```diff
- import {unstable__getSitemap as getSitemap} from '@shopify/hydrogen';
+ import {getSitemap} from '@shopify/hydrogen';
```


### H2O compatibility date [#2380](https://github.com/Shopify/hydrogen/pull/2380)

#### Check your project is working properly in an Oxygen deployment
[#2380](https://github.com/Shopify/hydrogen/pull/2380)

### Simplified creation of app context. [#2333](https://github.com/Shopify/hydrogen/pull/2333)

#### Step: 1. Create a app/lib/context file and use `createHydrogenContext` in it. [#2333](https://github.com/Shopify/hydrogen/pull/2333)

[#2333](https://github.com/Shopify/hydrogen/pull/2333)
```.ts
// in app/lib/context

import {createHydrogenContext} from '@shopify/hydrogen';

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
      // ensure to overwrite any options that is not using the default values from your server.ts
    });

  return {
    ...hydrogenContext,
    // declare additional Remix loader context
  };
}

```

#### Step: 2. Use `createAppLoadContext` method in server.ts Ensure to overwrite any options that is not using the default values in `createHydrogenContext` [#2333](https://github.com/Shopify/hydrogen/pull/2333)

[#2333](https://github.com/Shopify/hydrogen/pull/2333)
```diff
// in server.ts

- import {
-   createCartHandler,
-   createStorefrontClient,
-   createCustomerAccountClient,
- } from '@shopify/hydrogen';
+ import {createAppLoadContext} from '~/lib/context';

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {

-   const {storefront} = createStorefrontClient(
-     ...
-   );

-   const customerAccount = createCustomerAccountClient(
-     ...
-   );

-   const cart = createCartHandler(
-     ...
-   );

+   const appLoadContext = await createAppLoadContext(
+      request,
+      env,
+      executionContext,
+   );

    /**
      * Create a Remix request handler and pass
      * Hydrogen's Storefront client to the loader context.
      */
    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
-      getLoadContext: (): AppLoadContext => ({
-        session,
-        storefront,
-        customerAccount,
-        cart,
-        env,
-        waitUntil,
-      }),
+      getLoadContext: () => appLoadContext,
    });
  }
```

#### Step: 3. Use infer type for AppLoadContext in env.d.ts [#2333](https://github.com/Shopify/hydrogen/pull/2333)

[#2333](https://github.com/Shopify/hydrogen/pull/2333)
```diff
// in env.d.ts

+ import type {createAppLoadContext} from '~/lib/context';

+ interface AppLoadContext extends Awaited<ReturnType<typeof createAppLoadContext>> {
- interface AppLoadContext {
-  env: Env;
-  cart: HydrogenCart;
-  storefront: Storefront;
-  customerAccount: CustomerAccount;
-  session: AppSession;
-  waitUntil: ExecutionContext['waitUntil'];
}

```

### Optimistic variant [#2113](https://github.com/Shopify/hydrogen/pull/2113)

#### Step: 1. Example of product display page update [#2113](https://github.com/Shopify/hydrogen/pull/2113)

[#2113](https://github.com/Shopify/hydrogen/pull/2113)
```.tsx
function Product() {
  const {product, variants} = useLoaderData<typeof loader>();

  // The selectedVariant optimistically changes during page
  // transitions with one of the preloaded product variants
  const selectedVariant = useOptimisticVariant(
    product.selectedVariant,
    variants,
  );

  return <ProductMain selectedVariant={selectedVariant} />;
}
```

#### Step: 2. Optional <VariantSelector /> update [#2113](https://github.com/Shopify/hydrogen/pull/2113)

[#2113](https://github.com/Shopify/hydrogen/pull/2113)
```diff
<VariantSelector
  handle={product.handle}
  options={product.options}
+  waitForNavigation
>
  ...
</VariantSelector>
```

### [Breaking Change] New session commit pattern [#2137](https://github.com/Shopify/hydrogen/pull/2137)

#### Step: 1. Add isPending implementation in session [#2137](https://github.com/Shopify/hydrogen/pull/2137)

[#2137](https://github.com/Shopify/hydrogen/pull/2137)
```diff
// in app/lib/session.ts
export class AppSession implements HydrogenSession {
+  public isPending = false;

  get unset() {
+    this.isPending = true;
    return this.#session.unset;
  }

  get set() {
+    this.isPending = true;
    return this.#session.set;
  }

  commit() {
+    this.isPending = false;
    return this.#sessionStorage.commitSession(this.#session);
  }
}
```

#### Step: 2. update response header if `session.isPending` is true [#2137](https://github.com/Shopify/hydrogen/pull/2137)

[#2137](https://github.com/Shopify/hydrogen/pull/2137)
```diff
// in server.ts
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const response = await handleRequest(request);

+      if (session.isPending) {
+        response.headers.set('Set-Cookie', await session.commit());
+      }

      return response;
    } catch (error) {
      ...
    }
  },
};
```

#### Step: 3. remove setting cookie with `session.commit()` in routes [#2137](https://github.com/Shopify/hydrogen/pull/2137)

[#2137](https://github.com/Shopify/hydrogen/pull/2137)
```diff
// in route files
export async function loader({context}: LoaderFunctionArgs) {
  return json({},
-    {
-      headers: {
-        'Set-Cookie': await context.session.commit(),
-      },
    },
  );
}
```

### Add `@shopify/mini-oxygen` as a dev dependency for local development [#1891](https://github.com/Shopify/hydrogen/pull/1891)

#### package.json
[#1891](https://github.com/Shopify/hydrogen/pull/1891)
```diff
 "devDependencies": {
    "@remix-run/dev": "^2.8.0",
    "@remix-run/eslint-config": "^2.8.0",
+   "@shopify/mini-oxygen": "^3.0.0",
    "@shopify/oxygen-workers-types": "^4.0.0",
    ...
  }
```

### Support scaffolding projects from external repositories using the `--template` flag [#1867](https://github.com/Shopify/hydrogen/pull/1867)

#### The following examples are equivalent
[#1867](https://github.com/Shopify/hydrogen/pull/1867)
```bash
npm create @shopify/hydrogen -- --template shopify/hydrogen-demo-store
npm create @shopify/hydrogen -- --template github.com/shopify/hydrogen-demo-store
npm create @shopify/hydrogen -- --template https://github.com/shopify/hydrogen-demo-store
```

### Deprecate the `<Seo />` component in favor of directly using Remix meta route exports [#1875](https://github.com/Shopify/hydrogen/pull/1875)

#### Step: 1. Remove the `<Seo />` component from `root.jsx` [#1875](https://github.com/Shopify/hydrogen/pull/1875)

[#1875](https://github.com/Shopify/hydrogen/pull/1875)
```diff
export default function App() {
   const nonce = useNonce();
   const data = useLoaderData<typeof loader>();

   return (
     <html lang="en">
       <head>
         <meta charSet="utf-8" />
         <meta name="viewport" content="width=device-width,initial-scale=1" />
-        <Seo />
         <Meta />
         <Links />
       </head>
       <body>
         <Layout {...data}>
           <Outlet />
         </Layout>
         <ScrollRestoration nonce={nonce} />
         <Scripts nonce={nonce} />
         <LiveReload nonce={nonce} />
       </body>
     </html>
   );
 }
```

#### Step: 2. Add a Remix meta export to each route that returns an seo property from a loader or handle: [#1875](https://github.com/Shopify/hydrogen/pull/1875)

[#1875](https://github.com/Shopify/hydrogen/pull/1875)
```diff
+import {getSeoMeta} from '@shopify/hydrogen';

 export async function loader({context}) {
   const {shop} = await context.storefront.query(`
     query layout {
       shop {
         name
         description
       }
     }
   `);

   return {
     seo: {
       title: shop.title,
       description: shop.description,
     },
   };
 }

+export const meta = ({data}) => {
+   return getSeoMeta(data.seo);
+};
```

#### Step: 3. Merge root route meta data [#1875](https://github.com/Shopify/hydrogen/pull/1875)

[#1875](https://github.com/Shopify/hydrogen/pull/1875)
If your root route loader also returns an seo property, make sure to merge that data:

```js
export const meta = ({data, matches}) => {
  return getSeoMeta(
    matches[0].data.seo,
    // the current route seo data overrides the root route data
    data.seo,
  );
};
```
Or more simply:

```js
export const meta = ({data, matches}) => {
  return getSeoMeta(...matches.map((match) => match.data.seo));
};
```

#### Step: 4. Override meta [#1875](https://github.com/Shopify/hydrogen/pull/1875)

[#1875](https://github.com/Shopify/hydrogen/pull/1875)
Sometimes getSeoMeta might produce a property in a way you'd like to change. Map over the resulting array to change it. For example, Hydrogen removes query parameters from canonical URLs, add them back:

```js
export const meta = ({data, location}) => {
  return getSeoMeta(data.seo).map((meta) => {
    if (meta.rel === 'canonical') {
      return {
        ...meta,
        href: meta.href + location.search,
      };
    }

    return meta;
  });
};
```

### Codegen dependencies must be now listed explicitly in package.json [#1962](https://github.com/Shopify/hydrogen/pull/1962)

#### Update package.json
[#1962](https://github.com/Shopify/hydrogen/pull/1962)
```diff
{
  "devDependencies": {
+   "@graphql-codegen/cli": "5.0.2",
    "@remix-run/dev": "^2.8.0",
    "@remix-run/eslint-config": "^2.8.0",
+   "@shopify/hydrogen-codegen": "^0.3.0",
    "@shopify/mini-oxygen": "^2.2.5",
    "@shopify/oxygen-workers-types": "^4.0.0",
    ...
  }
}
```

### Update the GraphQL config in .graphqlrc.yml to use the more modern projects structure: [#1577](https://github.com/Shopify/hydrogen/pull/1577)

#### Step: 1. This allows you to add additional projects to the GraphQL config, such as third party CMS schemas. [#1577](https://github.com/Shopify/hydrogen/pull/1577)

[#1577](https://github.com/Shopify/hydrogen/pull/1577)
```diff
-schema: node_modules/@shopify/hydrogen/storefront.schema.json
+projects:
+ default:
+    schema: 'node_modules/@shopify/hydrogen/storefront.schema.json
```

#### Step: 2. Also, you can modify the document paths used for the Storefront API queries. This is useful if you have a large codebase and want to exclude certain files from being used for codegen or other GraphQL utilities: [#1577](https://github.com/Shopify/hydrogen/pull/1577)

[#1577](https://github.com/Shopify/hydrogen/pull/1577)
 ```yaml
    projects:
      default:
        schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
        documents:
          - '!*.d.ts'
          - '*.{ts,tsx,js,jsx}'
          - 'app/**/*.{ts,tsx,js,jsx}'
    ```

### Use new `variantBySelectedOptions` parameters introduced in Storefront API v2024-01 to fix redirection to the product's default variant when there are unknown query params in the URL. [#1642](https://github.com/Shopify/hydrogen/pull/1642)

#### Update the `product` query to include the `variantBySelectedOptions` parameters `ignoreUnknownOptions` and `caseInsensitiveMatch`
[#1642](https://github.com/Shopify/hydrogen/pull/1642)
```diff
-   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
+   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
```

### Better Hydrogen error handling [#1645](https://github.com/Shopify/hydrogen/pull/1645)

#### Changed the shape of the error objects returned by createCartHandler. Previously, mutations could return an errors array that contained a userErrors array. With this change, these arrays are no longer nested. The response can contain both an errors array and a userErrors array. errors contains GraphQL execution errors. userErrors contains errors caused by the cart mutation itself (such as adding a product that has zero inventory). storefront.isApiError is deprecated.
[#1645](https://github.com/Shopify/hydrogen/pull/1645)
```diff
- const data = await context.storefront.query(EXAMPLE_QUERY)
+ const {data, errors, userErrors} = await context.storefront.query(EXAMPLE_QUERY) 
```

```diff
- const cart = await context.cart.get()
+ const {cart, errors, userErrors} = await context.cart.get()
```

### Add deploy command to Hydrogen CLI [#1628](https://github.com/Shopify/hydrogen/pull/1628)

#### Use the new `h2 deploy` command to deploy your app
[#1628](https://github.com/Shopify/hydrogen/pull/1628)
```bash
npx shopify hydrogen deploy --help
```

### Add `--template` flag to enable scaffolding projects based on examples from the Hydrogen repo [#1608](https://github.com/Shopify/hydrogen/pull/1608)

#### Use the new `--template` flag to scaffold your app
[#1608](https://github.com/Shopify/hydrogen/pull/1608)
```bash
npm create @shopify/hydrogen@latest -- --template multipass
```

### Make the worker runtime the default environment for the local dev and preview. [#1625](https://github.com/Shopify/hydrogen/pull/1625)

#### To access the legacy Node.js runtime, pass the --legacy-runtime flag. The legacy runtime will be deprecated and removed in a future release.
[#1625](https://github.com/Shopify/hydrogen/pull/1625)
```diff
"scripts": {
-   "dev": "shopify hydrogen dev --codegen",
+   "dev": "shopify hydrogen dev --codegen --legacy-runtime",
-    "preview": "npm run build && shopify hydrogen preview",
+    "preview": "npm run build && shopify hydrogen preview --legacy-runtime",
}
```

### Make default HydrogenSession type extensible [#1590](https://github.com/Shopify/hydrogen/pull/1590)

#### New HydrogenSession type
[#1590](https://github.com/Shopify/hydrogen/pull/1590)
```diff
import {
+ type HydrogenSession,
} from '@shopify/hydrogen';

- class HydrogenSession {
+ class AppSession implements HydrogenSession {
    ...
}
```

### New `h2 upgrade` command [#1458](https://github.com/Shopify/hydrogen/pull/1458)

#### Step: 1. Try the upgrade command via [#1458](https://github.com/Shopify/hydrogen/pull/1458)

[docs](https://shopify.dev/docs/custom-storefronts/hydrogen/cli#upgrade)
[#1458](https://github.com/Shopify/hydrogen/pull/1458)
```bash
# from the base of the project run
h2 upgrade
```

#### Step: 2. Upgrade to a specific Hydrogen version with the --version flag [#1458](https://github.com/Shopify/hydrogen/pull/1458)

[docs](https://shopify.dev/docs/custom-storefronts/hydrogen/cli#upgrade)
[#1458](https://github.com/Shopify/hydrogen/pull/1458)
```bash
h2 upgrade --version 2023.10.3
```

### Enable debugger connections by passing `--debug` flag to the `h2 dev` command [#1480](https://github.com/Shopify/hydrogen/pull/1480)

#### Step: 1. Debugging on the default runtime (Node.js sandbox): [#1480](https://github.com/Shopify/hydrogen/pull/1480)

[#1480](https://github.com/Shopify/hydrogen/pull/1480)
```bash
h2 dev --debug
```

#### Step: 2. Debugging on the new worker runtime: [#1480](https://github.com/Shopify/hydrogen/pull/1480)

[#1480](https://github.com/Shopify/hydrogen/pull/1480)
```bash
h2 dev --debug --worker-unstable
```

### Added an optional prop to the `ShopPayButton` to enable order attribution support for either the Headless or Hydrogen sales channel. [#1447](https://github.com/Shopify/hydrogen/pull/1447)

#### Customize the order attribution via the `channel` prop
[#1447](https://github.com/Shopify/hydrogen/pull/1447)
```diff
<ShopPayButton
    variantIds={[variantId]}
    storeDomain={storeDomain}
+  channel="headless || hydrogen"
/>
```

### Storefront client the default caching strategy has been updated  [#1336](https://github.com/Shopify/hydrogen/pull/1336)

#### The new default caching strategy provides a max-age value of 1 second, and a stale-while-revalidate value of 1 day. If you would keep the old caching values, update your queries to use `CacheShort`
[#1336](https://github.com/Shopify/hydrogen/pull/1336)
// all instances of storefront.query

```diff
 const {product} = await storefront.query(
   `#graphql
     query Product($handle: String!) {
       product(handle: $handle) { id title }
     }
   `,
   {
     variables: {handle: params.productHandle},
+    /**
+     * Override the default caching strategy with the old caching values
+     */
+    cache: storefront.CacheShort(),
   },
 );
```

### Added `h2 debug cpu` command to profile CPU startup times (experimental) [#1352](https://github.com/Shopify/hydrogen/pull/1352)

#### Run `h2 debug cpu`
> This command builds + watches your app and generates a `startup.cpuprofile` file that you can open in DevTools or VSCode to see a flamegraph of CPU usage
[#1352](https://github.com/Shopify/hydrogen/pull/1352)
```bash
h2 debug cpu
```

### Added support for `withCache` request in debug-network tool [#1438](https://github.com/Shopify/hydrogen/pull/1438)

#### Calls to withCache can now be shown in the `/debug-network` tool when using the Worker runtime. For this to work, use the new `request` parameter in `createWithCache`
[#1438](https://github.com/Shopify/hydrogen/pull/1438)
// server.ts

```diff
export default {
  fetch(request, env, executionContext) {
    // ...
    const withCache = createWithCache({
      cache,
      waitUntil,
+     request,
    });
    // ...
  },
}
```

### Support custom attributes with `useLoadScript` [#1442](https://github.com/Shopify/hydrogen/pull/1442)

#### Step: 1. Pass `attributes` to any script [#1442](https://github.com/Shopify/hydrogen/pull/1442)

[#1442](https://github.com/Shopify/hydrogen/pull/1442)
// any instance of useLoadScript

```diff
+ const attributes = {
+    'data-test': 'test',
+    test: 'test',
+  }

- const scriptStatus = useLoadScript('test.js' )
const scriptStatus = useLoadScript('test.js', {  attributes } )
```

#### Step: 2. Would append a DOM element [#1442](https://github.com/Shopify/hydrogen/pull/1442)

[#1442](https://github.com/Shopify/hydrogen/pull/1442)
```html
<script src="test.js" data-test="test" test="test" />
```

### Add server-side network requests debugger (unstable) [#1284](https://github.com/Shopify/hydrogen/pull/1284)

#### Step: 1. Update server.ts so that it also passes in waitUntil and env [#1284](https://github.com/Shopify/hydrogen/pull/1284)

[#1284](https://github.com/Shopify/hydrogen/pull/1284)
```diff
const handleRequest = createRequestHandler({
    build: remixBuild,
    mode: process.env.NODE_ENV,
+    getLoadContext: () => ({session, storefront, env, waitUntil}),
});
```

#### Step: 2. If using typescript, also update `remix.env.d.ts` [#1284](https://github.com/Shopify/hydrogen/pull/1284)

[#1284](https://github.com/Shopify/hydrogen/pull/1284)
```diff
  declare module '@shopify/remix-oxygen' {
    export interface AppLoadContext {
+     env: Env;
      cart: HydrogenCart;
      storefront: Storefront;
      session: HydrogenSession;
+      waitUntil: ExecutionContext['waitUntil'];
    }
  }
```

### Add TypeScript v5 compatibility [#1240](https://github.com/Shopify/hydrogen/pull/1240)

#### Update typescript
> If you have typescript as a dev dependency in your app, it is recommended to change its version as follows:
[#1240](https://github.com/Shopify/hydrogen/pull/1240)
```diff
  "devDependencies": {
    ...
-   "typescript": "^4.9.5",
+   "typescript": "^5.2.2",
  }
}
```

----

----

## Fixes

### Use stable Customer Account API development flag [#3082-flag](https://github.com/Shopify/hydrogen/pull/3082)

#### Update command to use stable flag
> Remove the __unstable suffix from the customer-account-push command
[#3082-flag](https://github.com/Shopify/hydrogen/pull/3082)
```diff
- shopify hydrogen customer-account-push__unstable [flags]
+ shopify hydrogen customer-account-push [flags]

// The --customer-account-push flag is now stable and no longer requires __unstable suffix
```


### Add TypeScript ESLint rules for promise handling [#3146](https://github.com/Shopify/hydrogen/pull/3146)

#### Add promise handling rules to ESLint config
> Enable no-floating-promises and no-misused-promises rules. These catch unhandled promises that cause deployment failures.
[#3146](https://github.com/Shopify/hydrogen/pull/3146)
```diff
// eslint.config.js
export default tseslint.config(
  {
    rules: {
      // ... existing rules ...
+     '@typescript-eslint/no-floating-promises': 'error',
+     '@typescript-eslint/no-misused-promises': 'error',
    },
  },
);

// These rules prevent unhandled promises and promise misuse
// Helps avoid 'The script will never generate a response' errors on Oxygen/Cloudflare Workers
```


### Fix the customer account implementation to clear all session data on logout [#2843](https://github.com/Shopify/hydrogen/pull/2843)

#### You can opt out and keep custom data in the session by passing the `keepSession` option to logout
[#2843](https://github.com/Shopify/hydrogen/pull/2843)
```js
export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout({
    keepSession: true
  });
}
```

### Deprecate `<VariantSelector /> [#2837](https://github.com/Shopify/hydrogen/pull/2837)

#### Step: 1. Update the SFAPI product query to request the new required fields encodedVariantExistence and encodedVariantAvailability. This will allow the product form to determine which variants are available for selection. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
+    encodedVariantExistence
+    encodedVariantAvailability
    options {
      name
      optionValues {
        name
+        firstSelectableVariant {
+          ...ProductVariant
+        }
+        swatch {
+          color
+          image {
+            previewImage {
+              url
+            }
+          }
+        }
      }
    }
-    selectedVariant: selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+      ...ProductVariant
+    }
+    adjacentVariants (selectedOptions: $selectedOptions) {
+      ...ProductVariant
+    }
-    variants(first: 1) {
-      nodes {
-        ...ProductVariant
-      }
-    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
```

#### Step: 2. Remove the `VARIANTS_QUERY` and related logic from `loadDeferredData`, as querying all variants is no longer necessary. Simplifies the function to return an empty object. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
function loadDeferredData({context, params}: LoaderFunctionArgs) {
+  // Put any API calls that is not critical to be available on first page render
+  // For example: product reviews, product recommendations, social feeds.
-  // In order to show which variants are available in the UI, we need to query
-  // all of them. But there might be a *lot*, so instead separate the variants
-  // into it's own separate query that is deferred. So there's a brief moment
-  // where variant options might show as available when they're not, but after
-  // this deferred query resolves, the UI will update.
-  const variants = context.storefront
-    .query(VARIANTS_QUERY, {
-      variables: {handle: params.handle!},
-    })
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });

+  return {}
-  return {
-    variants,
-  };
}
```

#### Step: 3. Update the `Product` component to use `getAdjacentAndFirstAvailableVariants` for determining the selected variant, improving handling of adjacent and available variants. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
+  getAdjacentAndFirstAvailableVariants,
} from '@shopify/hydrogen';

export default function Product() {
+  const {product} = useLoaderData<typeof loader>();
-  const {product, variants} = useLoaderData<typeof loader>();

+  // Optimistically selects a variant with given available variant information
+  const selectedVariant = useOptimisticVariant(
+    product.selectedOrFirstAvailableVariant,
+    getAdjacentAndFirstAvailableVariants(product),
+  );
-  const selectedVariant = useOptimisticVariant(
-    product.selectedVariant,
-    variants,
-  );
```

#### Step: 4. Automatically update the URL with search parameters based on the selected product variant's options when no search parameters are present, ensuring the URL reflects the current selection without triggering navigation. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
+  mapSelectedProductOptionToObject,
} from '@shopify/hydrogen';

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

+  // Sets the search param to the selected variant without navigation
+  // only when no search params are set in the url
+  useEffect(() => {
+    const searchParams = new URLSearchParams(
+      mapSelectedProductOptionToObject(
+        selectedVariant.selectedOptions || [],
+      ),
+    );

+    if (window.location.search === '' && searchParams.toString() !== '') {
+      window.history.replaceState(
+        {},
+        '',
+        `${location.pathname}?${searchParams.toString()}`,
+      );
+    }
+  }, [
+    JSON.stringify(selectedVariant.selectedOptions),
+  ]);
```

#### Step: 5. Retrieve the product options array using `getProductOptions`, enabling efficient handling of product variants and their associated options. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
+  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  mapSelectedProductOptionToObject,
} from '@shopify/hydrogen';

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useEffect(() => {
    // ...
  }, [
    JSON.stringify(selectedVariant.selectedOptions),
  ]);

+  // Get the product options array
+  const productOptions = getProductOptions({
+    ...product,
+    selectedOrFirstAvailableVariant: selectedVariant,
+  });
```

#### Step: 6. Remove `Await` and `Suspense` from `ProductForm` as there are no longer any asynchronous queries to wait for, simplifying the component structure. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
export default function Product() {
  ...
  return (
    ...
+        <ProductForm
+          productOptions={productOptions}
+          selectedVariant={selectedVariant}
+        />
-        <Suspense
-          fallback={
-            <ProductForm
-              product={product}
-              selectedVariant={selectedVariant}
-              variants={[]}
-            />
-          }
-        >
-          <Await
-            errorElement="There was a problem loading product variants"
-            resolve={variants}
-          >
-            {(data) => (
-              <ProductForm
-                product={product}
-                selectedVariant={selectedVariant}
-                variants={data?.product?.variants.nodes || []}
-              />
-            )}
-          </Await>
-        </Suspense>
```

#### Step: 7. Refactor `ProductForm` to handle combined listing products and variants efficiently. It uses links for different product URLs and buttons for variant updates, improving SEO and user experience. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```tsx
import {Link, useNavigate} from '@remix-run/react';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  return (
    <div className="product-form">
      {productOptions.map((option) => (
        <div className="product-options" key={option.name}>
          <h5>{option.name}</h5>
          <div className="product-options-grid">
            {option.optionValues.map((value) => {
              const {
                name,
                handle,
                variantUriQuery,
                selected,
                available,
                exists,
                isDifferentProduct,
                swatch,
              } = value;

              if (isDifferentProduct) {
                // SEO
                // When the variant is a combined listing child product
                // that leads to a different URL, we need to render it
                // as an anchor tag
                return (
                  <Link
                    className="product-options-item"
                    key={option.name + name}
                    prefetch="intent"
                    preventScrollReset
                    replace
                    to={`/products/${handle}?${variantUriQuery}`}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </Link>
                );
              } else {
                // SEO
                // When the variant is an update to the search param,
                // render it as a button with JavaScript navigating to
                // the variant so that SEO bots do not index these as
                // duplicated links
                return (
                  <button
                    type="button"
                    className={`product-options-item${
                      exists && !selected ? ' link' : ''
                    }`}
                    key={option.name + name}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        navigate(`?${variantUriQuery}`, {
                          replace: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              }
            })}
          </div>
          <br />
        </div>
      ))}
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
```

#### Step: 8. Make `useVariantUrl` and `getVariantUrl` functions more flexible by allowing `selectedOptions` to be optional. This ensures compatibility with cases where no options are provided. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
export function useVariantUrl(
  handle: string,
-  selectedOptions: SelectedOption[],
+  selectedOptions?: SelectedOption[],
) {
  const {pathname} = useLocation();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathname]);
}
export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  pathname: string;
  searchParams: URLSearchParams;
-  selectedOptions: SelectedOption[];
+  selectedOptions?: SelectedOption[],
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;
  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`;

-  selectedOptions.forEach((option) => {
+  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });
```

#### Step: 9. Remove unnecessary variant queries and references in `routes/collections.$handle.tsx`, simplifying the code by relying on the product route to fetch the first available variant. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
-    variants(first: 1) {
-      nodes {
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
  }
` as const;
```

and remove the variant reference

```diff
function ProductItem({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
-  const variant = product.variants.nodes[0];
-  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
+  const variantUrl = useVariantUrl(product.handle);
  return (
```

#### Step: 10. Simplify the `ProductItem` component by removing variant-specific queries and logic. The `useVariantUrl` function now generates URLs without relying on variant options, reducing complexity. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
-    variants(first: 1) {
-      nodes {
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
  }
` as const;
```

and remove the variant reference

```diff
function ProductItem({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
-  const variant = product.variants.nodes[0];
-  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
+  const variantUrl = useVariantUrl(product.handle);
  return (
```

#### Step: 11. Replace `variants(first: 1)` with `selectedOrFirstAvailableVariant` in GraphQL fragments to directly fetch the most relevant variant, improving query efficiency and clarity. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
-    variants(first: 1) {
-      nodes {
+    selectedOrFirstAvailableVariant(
+      selectedOptions: []
+      ignoreUnknownOptions: true
+      caseInsensitiveMatch: true
+    ) {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
     }
-    }
  }
` as const;
```

```diff
const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
-    variants(first: 1) {
-      nodes {
+    selectedOrFirstAvailableVariant(
+      selectedOptions: []
+      ignoreUnknownOptions: true
+      caseInsensitiveMatch: true
+    ) {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
     }
-    }
  }
```

#### Step: 12. Refactor `SearchResultsProducts` to use `selectedOrFirstAvailableVariant` for fetching product price and image, simplifying the logic and improving performance. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>Products</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            });

+            const price = product?.selectedOrFirstAvailableVariant?.price;
+            const image = product?.selectedOrFirstAvailableVariant?.image;

            return (
              <div className="search-results-item" key={product.id}>
                <Link prefetch="intent" to={productUrl}>
-                  {product.variants.nodes[0].image && (
+                  {image && (
                    <Image
-                      data={product.variants.nodes[0].image}
+                      data={image}
                      alt={product.title}
                      width={50}
                    />
                  )}
                  <div>
                    <p>{product.title}</p>
                    <small>
-                      <Money data={product.variants.nodes[0].price} />
+                      {price &&
+                        <Money data={price} />
+                      }
                    </small>
                  </div>
                </Link>
              </div>
            );
          });
```

#### Step: 13. Update `SearchResultsPredictive` to use `selectedOrFirstAvailableVariant` for fetching product price and image, ensuring accurate and efficient data retrieval. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<'products'>) {
  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5>Products</h5>
      <ul>
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current,
          });

+          const price = product?.selectedOrFirstAvailableVariant?.price;
-          const image = product?.variants?.nodes?.[0].image;
+          const image = product?.selectedOrFirstAvailableVariant?.image;
          return (
            <li className="predictive-search-result-item" key={product.id}>
              <Link to={productUrl} onClick={closeSearch}>
                {image && (
                  <Image
                    alt={image.altText ?? ''}
                    src={image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <p>{product.title}</p>
                  <small>
-                    {product?.variants?.nodes?.[0].price && (
+                    {price && (
-                      <Money data={product.variants.nodes[0].price} />
+                      <Money data={price} />
                    )}
                  </small>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

### Workaround for "Error: failed to execute 'insertBefore' on 'Node'" that sometimes happen during development. [#2710](https://github.com/Shopify/hydrogen/pull/2710)

#### Update your root.tsx so that your style link tags are actual html link tags
[#2710](https://github.com/Shopify/hydrogen/pull/2710)
```diff
// root.tsx

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
-    {rel: 'stylesheet', href: resetStyles},
-    {rel: 'stylesheet', href: appStyles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

...

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
+        <link rel="stylesheet" href={resetStyles}></link>
+        <link rel="stylesheet" href={appStyles}></link>

```

### Make set up cookie banner by default to false [#2588](https://github.com/Shopify/hydrogen/pull/2588)

#### If you are using Shopify's cookie banner to handle user consent in your app, you need to set `withPrivacyBanner: true` to the consent config. Without this update, the Shopify cookie banner will not appear.
[#2588](https://github.com/Shopify/hydrogen/pull/2588)
```diff
  return defer({
    ...
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
+      withPrivacyBanner: true,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  });
```


### Deprecate usages of product.options.values and use product.options.optionValues instead [#2585](https://github.com/Shopify/hydrogen/pull/2585)

#### Step: 1. Update your product graphql query to use the new `optionValues` field [#2585](https://github.com/Shopify/hydrogen/pull/2585)

[#2585](https://github.com/Shopify/hydrogen/pull/2585)
```diff
  const PRODUCT_FRAGMENT = `#graphql
    fragment Product on Product {
      id
      title
      options {
        name
-        values
+        optionValues {
+          name
+        }
      }
```


#### Step: 2. Update your `<VariantSelector>` to use the new `optionValues` field [#2585](https://github.com/Shopify/hydrogen/pull/2585)

[#2585](https://github.com/Shopify/hydrogen/pull/2585)
```diff
  <VariantSelector
    handle={product.handle}
-    options={product.options.filter((option) => option.values.length > 1)}
+    options={product.options.filter((option) => option.optionValues.length > 1)}
    variants={variants}
  >
```


### Update all cart mutation methods from createCartHandler to return cart warnings [#2572](https://github.com/Shopify/hydrogen/pull/2572)

#### Check warnings for stock levels
[#2572](https://github.com/Shopify/hydrogen/pull/2572)

### Update createWithCache to make it harder to accidentally cache undesired results [#2546](https://github.com/Shopify/hydrogen/pull/2546)

#### Step: 1. request is now a mandatory prop when initializing createWithCache. [#2546](https://github.com/Shopify/hydrogen/pull/2546)

[#2546](https://github.com/Shopify/hydrogen/pull/2546)
```diff
// server.ts
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      // ...
-     const withCache = createWithCache({cache, waitUntil});
+     const withCache = createWithCache({cache, waitUntil, request});
```


#### Step: 2. New `withCache.fetch` is for caching simple fetch requests. This method caches the responses if they are OK responses, and you can pass `shouldCacheResponse`, `cacheKey`, etc. to modify behavior. `data` is the consumed body of the response (we need to consume to cache it). [#2546](https://github.com/Shopify/hydrogen/pull/2546)

[#2546](https://github.com/Shopify/hydrogen/pull/2546)
```ts
  const withCache = createWithCache({cache, waitUntil, request});

  const {data, response} = await withCache.fetch<{data: T; error: string}>(
    'my-cms.com/api',
    {
      method: 'POST',
      headers: {'Content-type': 'application/json'},
      body,
    },
    {
      cacheStrategy: CacheLong(),
      // Cache if there are no data errors or a specific data that make this result not suited for caching
      shouldCacheResponse: (result) => !result?.error,
      cacheKey: ['my-cms', body],
      displayName: 'My CMS query',
    },
  );
```


#### Step: 3. The original `withCache` callback function is now `withCache.run`. This is useful to run *multiple* fetch calls and merge their responses, or run any arbitrary code. It caches anything you return, but you can throw if you don't want to cache anything. [#2546](https://github.com/Shopify/hydrogen/pull/2546)

[#2546](https://github.com/Shopify/hydrogen/pull/2546)
```diff
  const withCache = createWithCache({cache, waitUntil, request});

  const fetchMyCMS = (query) => {
-    return withCache(['my-cms', query], CacheLong(), async (params) => {
+    return withCache.run({
+      cacheKey: ['my-cms', query],
+      cacheStrategy: CacheLong(),
+      // Cache if there are no data errors or a specific data that make this result not suited for caching
+      shouldCacheResult: (result) => !result?.errors,
+    }, async(params) => {
      const response = await fetch('my-cms.com/api', {
        method: 'POST',
        body: query,
      });
      if (!response.ok) throw new Error(response.statusText);
      const {data, error} = await response.json();
      if (error || !data) throw new Error(error ?? 'Missing data');
      params.addDebugData({displayName: 'My CMS query', response});
      return data;
    });
  };
```


### Fix an infinite redirect when viewing the cached version of a Hydrogen site on Google Web Cache [#2334](https://github.com/Shopify/hydrogen/pull/2334)

#### Update your entry.client.jsx file to include this check
[#2334](https://github.com/Shopify/hydrogen/pull/2334)
```diff
+ if (!window.location.origin.includes("webcache.googleusercontent.com")) {
   startTransition(() => {
     hydrateRoot(
       document,
       <StrictMode>
         <RemixBrowser />
       </StrictMode>
     );
   });
+ }
```

### Remix upgrade and use Layout component in root file. This new pattern will eliminate the use of useLoaderData in ErrorBoundary and clean up the root file of duplicate code. [#2290](https://github.com/Shopify/hydrogen/pull/2290)

#### Step: 1. Refactor App export to become Layout export [#2290](https://github.com/Shopify/hydrogen/pull/2290)

[#2290](https://github.com/Shopify/hydrogen/pull/2290)
```diff
-export default function App() {
+export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
-  const data = useLoaderData<typeof loader>();
+  const data = useRouteLoaderData<typeof loader>('root');

  return (
    <html>
    ...
      <body>
-        <Layout {...data}>
-          <Outlet />
-        </Layout>
+        {data? (
+          <PageLayout {...data}>{children}</PageLayout>
+         ) : (
+          children
+        )}
      </body>
    </html>
  );
}
```

#### Step: 2. Simplify default App export [#2290](https://github.com/Shopify/hydrogen/pull/2290)

[#2290](https://github.com/Shopify/hydrogen/pull/2290)
```diff
+export default function App() {
+  return <Outlet />;
+}
```

#### Step: 3. Remove wrapping layout from ErrorBoundary [#2290](https://github.com/Shopify/hydrogen/pull/2290)

[#2290](https://github.com/Shopify/hydrogen/pull/2290)
```diff
export function ErrorBoundary() {
- const rootData = useLoaderData<typeof loader>();

  return (
-    <html>
-    ...
-      <body>
-        <Layout {...rootData}>
-          <div className="route-error">
-            <h1>Error</h1>
-            ...
-          </div>
-        </Layout>
-      </body>
-    </html>
+    <div className="route-error">
+      <h1>Error</h1>
+      ...
+    </div>
  );
}
```

### [Breaking Change] `<VariantSelector />` improved handling of options [#1198](https://github.com/Shopify/hydrogen/pull/1198)

#### Update options prop when using <VariantSelector />
[#1198](https://github.com/Shopify/hydrogen/pull/1198)
```diff
 <VariantSelector
   handle={product.handle}
+  options={product.options.filter((option) => option.values.length > 1)}
-  options={product.options}
   variants={variants}>
 </VariantSelector>
```

### Fix a bug where cart could be null, even though a new cart was created by adding a line item. [#1865](https://github.com/Shopify/hydrogen/pull/1865)

#### Example
[#1865](https://github.com/Shopify/hydrogen/pull/1865)
```ts
import {
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';

const cartHandler = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  cartQueryFragment: CART_QUERY_FRAGMENT,
  cartMutateFragment: CART_MUTATE_FRAGMENT,
});

await cartHandler.addLines([{merchandiseId: '...'}]);
// .get() now returns the cart as expected
const cart = await cartHandler.get();
```

### Update Vite plugin imports, and how their options are passed to Remix [#1935](https://github.com/Shopify/hydrogen/pull/1935)

#### vite.config.js
[#1935](https://github.com/Shopify/hydrogen/pull/1935)
```diff
-import {hydrogen, oxygen} from '@shopify/cli-hydrogen/experimental-vite';
+import {hydrogen} from '@shopify/hydrogen/vite';
+import {oxygen} from '@shopify/mini-oxygen/vite';
import {vitePlugin as remix} from '@remix-run/dev';

export default defineConfig({
    hydrogen(),
    oxygen(),
    remix({
-     buildDirectory: 'dist',
+     presets: [hydrogen.preset()],
      future: {
```

### Change `storefrontRedirect` to ignore query parameters when matching redirects [#1900](https://github.com/Shopify/hydrogen/pull/1900)

#### This is a breaking change. If you want to retain the legacy functionality that is query parameter sensitive, pass matchQueryParams to storefrontRedirect():
[#1900](https://github.com/Shopify/hydrogen/pull/1900)
```js
storefrontRedirect({
  request,
  response,
  storefront,
+  matchQueryParams: true,
});
```

### Fix types returned by the session object [#1869](https://github.com/Shopify/hydrogen/pull/1869)

#### In remix.env.d.ts or env.d.ts, add the following types
[#1869](https://github.com/Shopify/hydrogen/pull/1869)
```diff
import type {
  // ...
  HydrogenCart,
+ HydrogenSessionData,
} from '@shopify/hydrogen';

// ...

declare module '@shopify/remix-oxygen' {
  // ...

+ interface SessionData extends HydrogenSessionData {}
}
```

### Fix 404 not working on certain unknown and i18n routes [#1732](https://github.com/Shopify/hydrogen/pull/1732)

#### Add a `($locale).tsx` route with the following contents
[#1732](https://github.com/Shopify/hydrogen/pull/1732)
```js
import {type LoaderFunctionArgs} from '@remix-run/server-runtime';

export async function loader({params, context}: LoaderFunctionArgs) {
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are still at the default locale
    // then the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

  return null;
}
```

### Use new `variantBySelectedOptions` parameters introduced in Storefront API v2024-01 to fix redirection to the product's default variant when there are unknown query params in the URL. [#1642](https://github.com/Shopify/hydrogen/pull/1642)

#### Update the `product` query to include the `variantBySelectedOptions` parameters `ignoreUnknownOptions` and `caseInsensitiveMatch`
[#1642](https://github.com/Shopify/hydrogen/pull/1642)
```diff
-   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
+   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
```

### In TypeScript projects, when updating to the latest `@shopify/remix-oxygen` adapter release, please update also to the latest version of `@shopify/oxygen-workers-types` [#1494](https://github.com/Shopify/hydrogen/pull/1494)

#### Upgrade @shopify/oxygen-workers-types dependency
[#1494](https://github.com/Shopify/hydrogen/pull/1494)
```diff
"devDependencies": {
  "@remix-run/dev": "2.1.0",
  "@remix-run/eslint-config": "2.1.0",
- "@shopify/oxygen-workers-types": "^3.17.3",
+ "@shopify/oxygen-workers-types": "^4.0.0",
  "@shopify/prettier-config": "^1.1.2",
  ...
},
```

### Updated internal dependencies for bug resolution [#1496](https://github.com/Shopify/hydrogen/pull/1496)

#### Update the `@shopify/cli` dependency in your app to avoid duplicated subdependencies:
[#1496](https://github.com/Shopify/hydrogen/pull/1496)
```diff
  "dependencies": {
-   "@shopify/cli": "3.50.2",
+   "@shopify/cli": "3.51.0",
  }
```

### Add `@remix-run/server-runtime` as a dev dependency.  [#1489](https://github.com/Shopify/hydrogen/pull/1489)

#### Since Remix is now a peer dependency of `@shopify/remix-oxygen`, you need to add `@remix-run/server-runtime` to your dependencies with the same version you have for the rest of Remix dependencies
[#1489](https://github.com/Shopify/hydrogen/pull/1489)
```diff
"dependencies": {
  "@remix-run/react": "2.1.0"
+ "@remix-run/server-runtime": "2.1.0"
  ...
}
```

### Custom cart methods are now stable [#1440](https://github.com/Shopify/hydrogen/pull/1440)

#### Update `createCartHandler` if needed
[#1440](https://github.com/Shopify/hydrogen/pull/1440)
// server.ts

```diff
const cart = createCartHandler({
   storefront,
   getCartId,
   setCartId: cartSetIdDefault(),
-  customMethods__unstable: {
+  customMethods: {
     addLines: async (lines, optionalParams) => {
      // ...
     },
   },
 });
```

### Updated CLI dependencies to improve terminal output. [#1456](https://github.com/Shopify/hydrogen/pull/1456)

#### Upgrade `@shopify/cli dependency`
[#1456](https://github.com/Shopify/hydrogen/pull/1456)
```bash
npm add @shopify/cli@3.50.0
```

### Updated the starter template `Header` and `Footer` menu components for 2023.10.0 [#1465](https://github.com/Shopify/hydrogen/pull/1465)

#### Step: 1. Update the HeaderMenu component to accept a primaryDomainUrl and include it in the internal url check [#1465](https://github.com/Shopify/hydrogen/pull/1465)

[#1465](https://github.com/Shopify/hydrogen/pull/1465)
```diff
// app/components/Header.tsx

+ import type {HeaderQuery} from 'storefrontapi.generated';

export function HeaderMenu({
  menu,
+  primaryDomainUrl,
  viewport,
}: {
  menu: HeaderProps['header']['menu'];
+  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
  viewport: Viewport;
}) {

  // ...code

  // if the url is internal, we strip the domain
  const url =
    item.url.includes('myshopify.com') ||
    item.url.includes(publicStoreDomain) ||
+   item.url.includes(primaryDomainUrl)
      ? new URL(item.url).pathname
      : item.url;

   // ...code

}
```

#### Step: 2. Update the FooterMenu component to accept a primaryDomainUrl prop and include it in the internal url check [#1465](https://github.com/Shopify/hydrogen/pull/1465)

[#1465](https://github.com/Shopify/hydrogen/pull/1465)
```diff
// app/components/Footer.tsx

- import type {FooterQuery} from 'storefrontapi.generated';
+ import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';

function FooterMenu({
  menu,
+  primaryDomainUrl,
}: {
  menu: FooterQuery['menu'];
+  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
}) {
  // code...

  // if the url is internal, we strip the domain
  const url =
    item.url.includes('myshopify.com') ||
    item.url.includes(publicStoreDomain) ||
+   item.url.includes(primaryDomainUrl)
      ? new URL(item.url).pathname
      : item.url;

   // ...code

  );
}
```

#### Step: 3. Update the Footer component to accept a shop prop [#1465](https://github.com/Shopify/hydrogen/pull/1465)

[#1465](https://github.com/Shopify/hydrogen/pull/1465)
```diff
export function Footer({
  menu,
+ shop,
}: FooterQuery & {shop: HeaderQuery['shop']}) {
  return (
    <footer className="footer">
-      <FooterMenu menu={menu} />
+      <FooterMenu menu={menu} primaryDomainUrl={shop.primaryDomain.url} />
    </footer>
  );
}
```

#### Step: 4. Update Layout.tsx to pass the shop prop [#1465](https://github.com/Shopify/hydrogen/pull/1465)

[#1465](https://github.com/Shopify/hydrogen/pull/1465)
```diff
export function Layout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
}: LayoutProps) {
  return (
    <>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside menu={header.menu} shop={header.shop} />
      <Header header={header} cart={cart} isLoggedIn={isLoggedIn} />
      <main>{children}</main>
      <Suspense>
        <Await resolve={footer}>
-          {(footer) => <Footer menu={footer.menu}  />}
+          {(footer) => <Footer menu={footer.menu} shop={header.shop} />}
        </Await>
      </Suspense>
    </>
  );
}
```

### Enhance useMatches returned type inference [#1289](https://github.com/Shopify/hydrogen/pull/1289)

#### If you are calling `useMatches()` in different places of your app to access the data returned by the root loader, you may want to update it to the following pattern to enhance types:
[#1289](https://github.com/Shopify/hydrogen/pull/1289)
```ts
// root.tsx

import {useMatches} from '@remix-run/react';
import {type SerializeFrom} from '@shopify/remix-oxygen';

export const useRootLoaderData = () => {
  const [root] = useMatches();
  return root?.data as SerializeFrom<typeof loader>;
};

export function loader(context) {
  // ...
}
```

### Fix the Pagination component to reset internal state when the URL changes [#1291](https://github.com/Shopify/hydrogen/pull/1291)

#### Add `startCursor` to the query pageInfo
> Update pageInfo in all pagination queries. Here is an example route with a pagination query
[#1291](https://github.com/Shopify/hydrogen/pull/1291)
```diff
query CollectionDetails {
   collection(handle: $handle) {
     ...
     pageInfo {
       hasPreviousPage
       hasNextPage
       hasNextPage
       endCursor
+      startCursor
     }
   }
}
```
