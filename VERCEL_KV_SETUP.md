# Vercel KV Setup Guide

## What Changed

We've migrated from cookie-based session storage (per-user) to Vercel KV storage (shared across all users). This is the correct architecture for a Shopify storefront where:

- ONE OAuth token is used by the entire app
- ALL visitors share the same token to access store data
- Token persists across deployments and serverless invocations

## Setup Steps

### 1. Create Vercel KV Database

```bash
# In your project directory
vercel env pull
```

Then go to:
https://vercel.com/ekovshilovskys-projects/artfulfam/stores

1. Click "Create" → "KV Database"
2. Name it: `artfulfam-sessions`
3. Click "Create"
4. Vercel will automatically add the KV environment variables to your project

### 2. Pull the new environment variables locally

```bash
vercel env pull .env.local
```

This adds:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 3. Deploy to trigger OAuth flow

```bash
# Deploy to preview
vercel

# Or deploy to production
vercel --prod
```

### 4. Complete OAuth (ONE TIME SETUP)

After deployment, visit your deployed URL. The middleware will automatically redirect you to:

```
https://your-app.vercel.app/api/auth/shopify/install?shop=artful-family-2.myshopify.com
```

This will:
1. Redirect to Shopify to authorize the app
2. Shopify redirects back to your callback
3. Access token is stored in Vercel KV
4. All future visitors use this token automatically

### 5. Verify it works

Check the Vercel KV dashboard to see the stored keys:
- `shopify:access_token`
- `shopify:scope`  
- `shopify:shop`

## How It Works

1. **User visits site** → Middleware checks KV for token
2. **No token found** → Redirect to OAuth install
3. **OAuth completes** → Token stored in KV
4. **All subsequent visitors** → Use token from KV
5. **Token persists** → Across all deployments and serverless functions

## Benefits

✅ Token shared across ALL users (correct architecture)
✅ Survives deployments and redeploys
✅ No database needed (KV is simple and fast)
✅ Automatic OAuth redirect on first access
✅ Works perfectly with Vercel serverless

## Troubleshooting

**Error: KV_URL not found**
- Run `vercel env pull` to get KV credentials

**Redirect loop**
- Check that NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is set correctly
- Verify OAuth callback URL in Shopify Partner Dashboard

**Token not persisting**
- Check Vercel KV dashboard for the keys
- Verify KV environment variables are set in Vercel dashboard
