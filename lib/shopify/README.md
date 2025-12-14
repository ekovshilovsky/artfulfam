# Shopify OAuth Authentication Setup

This application uses Shopify's OAuth authorization code grant flow to authenticate and access the Shopify Admin API.

## Prerequisites

1. A Shopify Partner account
2. A development store or production store
3. A custom app created in your Shopify admin

## Setup Instructions

### 1. Create a Custom App in Shopify

1. Go to your Shopify Admin
2. Navigate to **Settings > Apps and sales channels**
3. Click **Develop apps**
4. Click **Create an app**
5. Give your app a name and click **Create app**

### 2. Configure OAuth Scopes

1. In your app settings, go to **Configuration**
2. Under **Admin API access scopes**, select the following scopes:
   - `read_products` - To read product data
   - `read_customers` - To read customer data
   - `write_customers` - To create and update customers
   - `read_orders` - To read order data (optional)

3. Click **Save**

### 3. Get Your OAuth Credentials

1. In your app settings, go to **API credentials**
2. Copy the **Client ID** (API key)
3. Copy the **Client secret** (API secret key) - you'll only see this once!

### 4. Configure Storefront API

1. In your app settings, go to **Configuration**
2. Under **Storefront API access scopes**, select the scopes you need (e.g., `unauthenticated_read_product_listings`)
3. Click **Save**
4. Go to **API credentials** and copy the **Storefront API access token**

### 5. Set Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Configure App URL for OAuth

1. In your app settings, go to **Configuration**
2. Under **App URL**, add: `http://localhost:3000` (for development)
3. Under **Allowed redirection URL(s)**, add: `http://localhost:3000/api/auth/shopify/callback`
4. For production, add your production URLs as well

### 7. Install the App

To authenticate and get an access token, visit:

```
http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com
```

This will:
1. Redirect you to Shopify to authorize the app
2. After authorization, redirect back to your app with an access token
3. Store the access token securely in a cookie

## OAuth Flow

The OAuth flow is handled by the following files:

- `/app/api/auth/shopify/install/route.ts` - Initiates the OAuth flow
- `/app/api/auth/shopify/callback/route.ts` - Handles the callback and exchanges code for token
- `/lib/shopify/oauth.ts` - Contains OAuth helper functions

## API Access

After authentication, the app uses two types of tokens:

1. **Admin API Token** (from OAuth flow)
   - Used for: Customer management, store settings
   - Stored in: Secure HTTP-only cookie
   - Functions: `shopifyAdminFetch()` in `oauth.ts`

2. **Storefront API Token** (static from env)
   - Used for: Product data, cart management
   - Stored in: Environment variable
   - Functions: `shopifyFetch()` in `index.ts`

## Security Notes

- Never commit `.env.local` to version control
- Keep your Client Secret secure
- Use HTTPS in production
- Validate HMAC signatures on OAuth callbacks
- Use secure, HTTP-only cookies for storing tokens

## Troubleshooting

### "Missing SHOPIFY_CLIENT_ID" Error

Make sure you've set the `SHOPIFY_CLIENT_ID` environment variable in your `.env.local` file.

### "Invalid HMAC signature" Error

This usually means:
- Your `SHOPIFY_CLIENT_SECRET` is incorrect
- The request was tampered with
- Time drift between servers

### "No access token available" Error

You need to complete the OAuth flow first by visiting:
```
http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com
```

### Admin API Returns 401

Make sure:
- You completed the OAuth flow
- The access token is still valid
- You have the required API scopes

## Resources

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
- [Admin API Reference](https://shopify.dev/docs/api/admin)
- [Storefront API Reference](https://shopify.dev/docs/api/storefront)
