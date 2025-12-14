# Shopify Art Store

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ekovshilovskys-projects/v0-shopify-art-store)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/cYy5eo5lA3f)

A modern Next.js storefront for Shopify, featuring OAuth authentication and seamless integration with Shopify's Admin and Storefront APIs.

## Features

- 🔐 **OAuth Authentication** - Secure authorization code grant flow
- 🛍️ **Product Management** - Display and manage Shopify products
- 🛒 **Cart Functionality** - Full shopping cart with Storefront API
- 👥 **Customer Management** - Create and update customer records
- 📱 **SMS Marketing** - Customer SMS consent management
- 🎨 **Modern UI** - Built with Next.js 16, React 19, and Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- A Shopify store (development or production)
- Custom app credentials (CLIENT_ID and CLIENT_SECRET)

### 5-Minute Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Configure app URLs in Shopify:**
   - Go to your app in Shopify Admin
   - Set App URL: `http://localhost:3000`
   - Add redirect URL: `http://localhost:3000/api/auth/shopify/callback`

4. **Start development server:**
```bash
pnpm dev
```

5. **Complete OAuth authentication:**
Visit `http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com`

Done! Your app is ready to use. ✅

**For detailed setup:** See [QUICKSTART.md](./QUICKSTART.md)

## Configuration

### Modern Shopify Integration

This app uses **`@shopify/shopify-api`** (official package) with OAuth for secure API access.

**Required Environment Variables:**

- `SHOPIFY_CLIENT_ID` - Your app's Client ID (API key)
- `SHOPIFY_CLIENT_SECRET` - Your app's Client Secret
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` - Your store domain
- `NEXT_PUBLIC_APP_URL` - Your app's URL

**No Storefront token needed!** One OAuth token does everything.

**Quick Setup:**

1. Create custom app in Partner Dashboard or Shopify Admin
2. Get CLIENT_ID and CLIENT_SECRET
3. Configure app redirect URLs
4. Complete OAuth flow
5. Start building!

**Detailed Guides:**
- [Quick Start Guide](./QUICKSTART.md) - Get running in 5 minutes
- [Modern Migration Complete](./MODERN_MIGRATION_COMPLETE.md) - Full technical details
- [Shopify OAuth Docs](https://shopify.dev/docs/apps/build/authentication-authorization)

## Architecture

### Authentication Flow

```
User → Install URL → Shopify OAuth → Callback → Access Token → API Calls
```

1. **OAuth Install** (`/api/auth/shopify/install`) - Initiates OAuth flow
2. **OAuth Callback** (`/api/auth/shopify/callback`) - Exchanges code for token
3. **Token Storage** - Securely stored in HTTP-only cookies
4. **API Access** - Automatic token injection for Admin API calls

### API Structure

- **Storefront API** - Public product data, cart management
- **Admin API** - Customer management, store settings (OAuth required)

### Key Files

- `/lib/shopify/oauth.ts` - OAuth implementation and token management
- `/lib/shopify/index.ts` - Storefront API integration
- `/lib/shopify/actions.ts` - Server actions for Admin API
- `/app/api/auth/shopify/` - OAuth routes

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Deployment

### Vercel Deployment

Your project is live at:
**[https://vercel.com/ekovshilovskys-projects/v0-shopify-art-store](https://vercel.com/ekovshilovskys-projects/v0-shopify-art-store)**

### Environment Variables

Set these in your Vercel project settings:

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add all required environment variables
3. Redeploy your app

### OAuth Configuration for Production

Update your Shopify app configuration:
- **App URL**: `https://your-domain.com`
- **Redirect URL**: `https://your-domain.com/api/auth/shopify/callback`

Then authenticate:
```
https://your-domain.com/api/auth/shopify/install?shop=your-store.myshopify.com
```

## Migration from Static Tokens

If you're upgrading from static access tokens to OAuth, see the [Migration Guide](./MIGRATION_GUIDE.md) for step-by-step instructions.

## Security

- ✅ OAuth tokens stored in secure HTTP-only cookies
- ✅ CSRF protection with state parameter
- ✅ HMAC signature verification
- ✅ Automatic fallback to environment variables
- ⚠️ Never commit `.env` files to version control
- ⚠️ Keep your Client Secret secure

## Documentation

- [Shopify OAuth Setup](./lib/shopify/README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
- [Admin API Reference](https://shopify.dev/docs/api/admin)
- [Storefront API Reference](https://shopify.dev/docs/api/storefront)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.0
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Authentication**: Shopify OAuth 2.0
- **API**: Shopify Admin API, Storefront API
- **Type Safety**: TypeScript 5

## Build with v0

Continue building your app on:
**[https://v0.app/chat/cYy5eo5lA3f](https://v0.app/chat/cYy5eo5lA3f)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Troubleshooting

### Common Issues

**"Missing SHOPIFY_CLIENT_ID" Error**
- Verify environment variables are set
- Restart development server

**"No access token available" Error**
- Complete OAuth flow: visit `/api/auth/shopify/install?shop=your-store.myshopify.com`

**401 Unauthorized from Admin API**
- Check required scopes in app configuration
- Re-authenticate through OAuth flow

For more troubleshooting help, see the [Migration Guide](./MIGRATION_GUIDE.md#troubleshooting).

## Support

For issues or questions:
1. Check the [Migration Guide](./MIGRATION_GUIDE.md)
2. Review [Shopify OAuth Setup](./lib/shopify/README.md)
3. Consult [Shopify Documentation](https://shopify.dev/docs)

## Contributing

This is an auto-synced v0.app project. Changes should be made through the v0.app interface and will automatically sync to this repository.