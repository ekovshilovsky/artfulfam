# Store Password Protection Detection

## How Shopify Password Protection Works

When you enable password protection in Shopify Admin (Online Store > Preferences > Password protection), Shopify handles it at the platform level:

1. **Development stores** are automatically password protected
2. When a user visits, Shopify shows its own password page
3. After entering the correct password, Shopify sets a `storefront_digest` cookie
4. Your Hydrogen app only loads for users with valid access

## Detection Methods

### Method 1: Check Storefront API Response (Recommended)
The Storefront API returns limited data when store is password protected and user hasn't entered password.

```typescript
// In any loader
import {isStorePasswordProtected} from '~/lib/store-access';

export async function loader({context}: LoaderFunctionArgs) {
  const isProtected = await isStorePasswordProtected(context);
  
  if (isProtected) {
    // Store is password protected and user hasn't entered password
    // Shopify will handle this automatically, but you can show custom UI
  }
}
```

### Method 2: Check for Access Cookie
```typescript
import {hasStoreAccessCookie} from '~/lib/store-access';

export async function loader({request}: LoaderFunctionArgs) {
  const hasAccess = hasStoreAccessCookie(request);
  
  if (!hasAccess) {
    // User hasn't entered store password
  }
}
```

### Method 3: Environment Variable (Simplest)
Set an environment variable:

```env
# .env
PUBLIC_STORE_PASSWORD_PROTECTED=true
```

Then check it in your code:

```typescript
const isPasswordProtected = context.env.PUBLIC_STORE_PASSWORD_PROTECTED === 'true';
```

## Custom Coming Soon Page Example

If you want to implement a custom "coming soon" page like first-version:

```typescript
// app/root.tsx or app/routes/_index.tsx
import {isStorePasswordProtected, hasStoreAccessCookie} from '~/lib/store-access';

export async function loader({context, request}: LoaderFunctionArgs) {
  // Check if password protected
  const isProtected = await isStorePasswordProtected(context);
  const hasAccess = hasStoreAccessCookie(request);
  
  const showComingSoon = isProtected && !hasAccess;
  
  return data({
    showComingSoon,
    // ... other data
  });
}

export default function App() {
  const {showComingSoon} = useLoaderData<typeof loader>();
  
  if (showComingSoon) {
    return <ComingSoonPage />;
  }
  
  return <NormalLayout />;
}
```

## Important Notes

1. **Shopify handles password protection automatically** - You usually don't need custom code
2. **Development stores** are always password protected until you choose a plan
3. The `storefront_digest` cookie is set by Shopify after successful password entry
4. Password protection affects the Storefront API - some queries return limited data

## For Your Current Setup

Your store is likely a development store (password protected by default). You have two options:

1. **Do nothing** - Let Shopify handle the password page (recommended)
2. **Add custom coming soon page** - Implement the check above and create a custom page

For most cases, option 1 is sufficient unless you need custom branding on the password page.
