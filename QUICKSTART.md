# Quick Start Guide - Modern Shopify Integration

## You Have 15 Days Before Legacy Deprecation ⏰

Your app now uses the **modern, non-legacy** Shopify API. Here's how to get started immediately.

## Prerequisites ✅

You already have:
- ✅ Custom app created (Partner Dashboard or Admin)
- ✅ `SHOPIFY_CLIENT_ID` environment variable
- ✅ `SHOPIFY_CLIENT_SECRET` environment variable
- ✅ Next.js app ready on Vercel

## 5-Minute Setup

### Step 1: Set Environment Variables (1 minute)

Create `.env.local` in your project root:

```env
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Configure App URLs (2 minutes)

Go to your app in Shopify (Admin → Apps → Develop apps → Your App):

1. Click **"Configuration"** tab
2. Under **"App URL"**, set: `http://localhost:3000`
3. Under **"Allowed redirection URL(s)"**, add: `http://localhost:3000/api/auth/shopify/callback`
4. Click **"Save"**

### Step 3: Start Dev Server (30 seconds)

```bash
pnpm install  # Dependencies already installed
pnpm dev
```

### Step 4: Complete OAuth (1 minute)

Visit this URL in your browser:
```
http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com
```

You'll be redirected to Shopify → Approve the app → Redirected back

### Step 5: Done! (30 seconds)

Visit your app: `http://localhost:3000`

Everything works now! ✅

## What Just Happened?

1. Your app redirected to Shopify OAuth
2. You approved the app
3. Shopify sent back an access token
4. Token stored securely in cookie
5. All API calls now work automatically

## Testing Your App

### Test Product Browsing
```
http://localhost:3000/products
```

### Test Single Product
```
http://localhost:3000/products/[handle]
```

### Test Cart
Add items to cart - should work!

### Test Customer Management
Newsletter signup - should work!

## Deploy to Production

### 1. Push to Git & Deploy to Vercel
```bash
git add .
git commit -m "Migrate to modern Shopify API"
git push
```

### 2. Set Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```env
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### 3. Update App URLs in Shopify

Go back to your app configuration:
- **App URL**: `https://your-domain.vercel.app`
- **Allowed redirect URLs**: `https://your-domain.vercel.app/api/auth/shopify/callback`

### 4. Complete OAuth in Production

Visit: `https://your-domain.vercel.app/api/auth/shopify/install?shop=your-store.myshopify.com`

Done! Your production app is live! 🎉

## Verification Checklist

- [ ] Environment variables set
- [ ] App URLs configured in Shopify
- [ ] OAuth completed (visited install URL)
- [ ] Products page loads
- [ ] Cart functionality works
- [ ] Customer actions work
- [ ] No console errors

## Common Issues

### Issue: "No active session"
**Fix:** Visit the install URL to complete OAuth:
```
http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com
```

### Issue: "SHOPIFY_CLIENT_ID is required"
**Fix:** Check your `.env.local` file exists and has correct values. Restart dev server.

### Issue: "Invalid redirect URI"
**Fix:** In Shopify app settings, add `http://localhost:3000/api/auth/shopify/callback` to allowed redirect URLs.

### Issue: Works locally but not on Vercel
**Fix:** 
1. Set environment variables in Vercel
2. Update app URLs to production domain
3. Complete OAuth in production

## Architecture Overview

```
Next.js App (Vercel)
    ↓
@shopify/shopify-api (Official Package)
    ↓
OAuth Token (Cookie)
    ↓
Shopify Admin API
    ├── Products
    ├── Collections  
    ├── Cart
    ├── Customers
    └── Orders
```

## Key Files

- `/lib/shopify/config.ts` - Shopify API setup
- `/lib/shopify/session-storage.ts` - Token storage
- `/app/api/auth/shopify/install/route.ts` - Start OAuth
- `/app/api/auth/shopify/callback/route.ts` - Complete OAuth
- `/lib/shopify/index.ts` - Product/cart queries
- `/lib/shopify/actions.ts` - Customer actions

## Support

See detailed docs:
- `MODERN_MIGRATION_COMPLETE.md` - Full migration details
- `README.md` - Project overview
- [Shopify Docs](https://shopify.dev/docs/api/shopify-app)

## Next Steps

1. ✅ Complete OAuth (5 min)
2. ✅ Test all features (10 min)
3. ✅ Deploy to Vercel (15 min)
4. ✅ Test production (5 min)

**Total time: ~35 minutes to fully deployed!**

You're all set with the modern, non-legacy Shopify integration! 🚀
