# Modern Shopify Authentication Approach (2024)

## The Problem

You don't have `SHOPIFY_STOREFRONT_ACCESS_TOKEN` because it's no longer the recommended approach for custom apps.

## The Solution

**Use Admin API OAuth token for EVERYTHING!**

Modern Shopify apps should use:
1. **One OAuth flow** → Get Admin API access token
2. **Use that token** for both Admin API and product queries
3. **No separate Storefront token needed**

## How It Works

### Old Approach (What we initially implemented)
```
Admin Operations → Admin API + OAuth ✅
Public Operations → Storefront API + Static Token ❌ (don't have this)
```

### Modern Approach (What you should use)
```
Everything → Admin API + OAuth ✅
```

## Implementation

I've created a new file: `/lib/shopify/storefront-via-admin.ts`

### Get Products (No Storefront Token Needed!)

```typescript
import { getProductsViaAdmin } from '@/lib/shopify/storefront-via-admin'

// Uses your OAuth token from Admin API
const products = await getProductsViaAdmin({ first: 12 })
```

### Get Single Product

```typescript
import { getProductByHandleViaAdmin } from '@/lib/shopify/storefront-via-admin'

const product = await getProductByHandleViaAdmin('cool-t-shirt')
```

### Get Collections

```typescript
import { getCollectionsViaAdmin } from '@/lib/shopify/storefront-via-admin'

const collections = await getCollectionsViaAdmin(10)
```

## What About Cart?

For cart operations, you have **two options**:

### Option 1: Draft Orders (Admin API)
Use Draft Orders instead of carts:
- Create draft order → Add items → Get checkout URL
- Uses your OAuth token
- No Storefront API needed

### Option 2: Storefront API (If you need cart features)
You still need a Storefront token for:
- Cart mutations
- Checkout creation
- But you can get this from your custom app settings!

## How to Get Storefront Token (If Needed)

Even though you said it's "legacy", you can still get it:

1. Go to **Shopify Admin** → Settings → Apps and sales channels
2. Click **Develop apps**
3. Select your custom app
4. Go to **Configuration** tab
5. Under **Storefront API**, configure scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_checkouts`
   - `unauthenticated_write_checkouts`
6. Click **Save**
7. Go to **API credentials** tab
8. You'll see **"Storefront API access token"** - copy it!

This is NOT legacy - it's still the current way to get public Storefront access!

## Recommended Architecture

```
Your Next.js App
│
├── OAuth Flow (One time)
│   └── Get Admin API token ✅
│
├── Product Browsing
│   └── Use Admin API GraphQL ✅
│
├── Customer Management
│   └── Use Admin API ✅
│
└── Cart/Checkout
    ├── Option A: Draft Orders (Admin API) ✅
    └── Option B: Storefront API (need token)
```

## What to Use

### For Your App (Choose One):

#### **Approach 1: Admin API Only** (Simpler, Recommended)
```env
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Pros:**
- ✅ Single OAuth flow
- ✅ One token for everything
- ✅ Simpler architecture

**Cons:**
- ⚠️ Cart operations need Draft Orders (different API)
- ⚠️ Checkout URL points to Shopify (can't customize much)

#### **Approach 2: Hybrid** (More Features)
```env
# OAuth for admin operations
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret

# Public token for storefront (get from custom app)
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_public_token

NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Pros:**
- ✅ Best cart experience
- ✅ Full Storefront API features
- ✅ Admin operations via OAuth

**Cons:**
- ⚠️ Two tokens to manage
- ⚠️ Slightly more complex

## What I Recommend

**Use Approach 1 (Admin API Only)** unless you specifically need advanced cart features.

## Next Steps

I can:
1. ✅ Update your app to use Admin API for product queries (no Storefront token needed)
2. 🔧 Implement Draft Orders for cart functionality
3. 📋 Show you how to get the Storefront token if you need it
4. 🎯 Implement hybrid approach

Which would you prefer?

## Quick Win

The file I just created (`storefront-via-admin.ts`) lets you browse products **without** the Storefront token!

Just update your imports from:
```typescript
import { getProducts } from '@/lib/shopify/index'
```

To:
```typescript
import { getProductsViaAdmin } from '@/lib/shopify/storefront-via-admin'
```

Should I make this change throughout your app?
