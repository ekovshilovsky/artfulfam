# Deployment Guide

This Hydrogen v2 storefront can be deployed to both Shopify Oxygen and Vercel.

## Prerequisites

1. **Shopify Store**: You need a paid Shopify plan (Basic or higher)
2. **Hydrogen Sales Channel**: Installed on your Shopify store
3. **Environment Variables**: Configured for your store

## Deploying to Shopify Oxygen (Recommended)

Oxygen is Shopify's native hosting platform for Hydrogen, providing optimal performance.

### Setup

1. Go to your Shopify admin at `artful-family.myshopify.com`
2. Navigate to **Sales channels** → **Hydrogen**
3. Click **"Create storefront"**
4. Connect your GitHub repository (`ekovshilovsky/artfulfam`)
5. Select the `main` branch for production
6. Oxygen will automatically deploy on every push to `main`

### Environment Variables

Oxygen automatically injects these variables:
- `SESSION_SECRET`
- `PUBLIC_STOREFRONT_API_TOKEN`
- `PRIVATE_STOREFRONT_API_TOKEN`
- `PUBLIC_STORE_DOMAIN`
- `PUBLIC_STOREFRONT_ID`

### Deployments

- **Production**: Push to `main` branch
- **Preview**: Push to any other branch (creates preview environment)

## Deploying to Vercel

Vercel supports Hydrogen v2 with automatic detection and Edge Functions.

### Setup

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Hydrogen
4. Configure environment variables (see below)
5. Deploy

### Environment Variables

Add these to your Vercel project settings:

```
SESSION_SECRET=<your-secret-key>
PUBLIC_STORE_DOMAIN=artful-family.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=<your-storefront-api-token>
PRIVATE_STOREFRONT_API_TOKEN=<your-private-token>
PUBLIC_STOREFRONT_ID=<your-storefront-id>
```

Get these values from:
- Shopify Admin → Sales channels → Hydrogen → Storefront settings

### Build Configuration

The `vercel.json` file is already configured:
- Build Command: `shopify hydrogen build`
- Output Directory: `dist/client`
- Runtime: Edge Functions

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
npm run dev
```

The dev server will run on `http://localhost:3000` using MiniOxygen (local Oxygen emulator).

### Environment Setup

Copy `.env.example` to `.env` and update with your store credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your actual Shopify store details.

## Differences Between Platforms

| Feature | Oxygen | Vercel |
|---------|--------|--------|
| Runtime | Cloudflare Workers | Vercel Edge Functions |
| Auto-deployment | ✅ Via Hydrogen channel | ✅ Via GitHub integration |
| Environment variables | Auto-injected | Manual configuration |
| Preview environments | ✅ Automatic per branch | ✅ Automatic per branch |
| Caching | Built-in worker cache | Edge cache |
| Cost | Included with Shopify plan | Free tier available |

## Troubleshooting

### Vercel Deployment Fails

- Ensure all environment variables are set
- Check that build command is using `shopify hydrogen build`
- Verify framework detection is set to `null` (lets Vercel auto-detect)

### Oxygen Deployment Fails

- Check GitHub connection in Hydrogen channel
- Verify user has proper permissions (owner or full app access)
- Review deployment logs in Shopify admin

### Local Development Issues

- Run `pnpm install` to ensure dependencies are installed
- Check `.env` file has all required variables
- Clear cache: `rm -rf .cache dist`
