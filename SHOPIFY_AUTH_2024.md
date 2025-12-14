# Shopify Authentication in 2024/2025

## Important Update: Storefront API Access

You're correct - the old `SHOPIFY_STOREFRONT_ACCESS_TOKEN` approach has changed!

## Current Shopify Authentication Methods

### For Custom Storefronts (Headless)

Shopify now has **two main approaches** for storefront authentication:

## Option 1: Storefront API with Public Access Token (Still Valid)

Despite what you might have heard, Storefront API **still uses access tokens**, but they're obtained differently now:

### How to Get Storefront Access Token in 2024

1. **Go to Shopify Admin** → Settings → Apps and sales channels
2. **Click "Develop apps"**
3. **Create an app** or select existing
4. **Go to Configuration**
5. **Under "Storefront API"** → Configure scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_read_checkouts`
   - etc.
6. **Save** and go to **API credentials**
7. **Copy "Storefront API access token"** - This is your public token!

This token is:
- ✅ Still valid and supported
- ✅ For public, unauthenticated storefront access
- ✅ Used for products, collections, cart operations
- ❌ NOT for authenticated customer operations

## Option 2: Customer Account API (New in 2023)

For **authenticated customer operations** (login, orders, addresses), Shopify now uses:

**Customer Account API** with OAuth 2.0

### What Changed?

**OLD WAY (Deprecated):**
```
Customer → Multipass → Shopify
```

**NEW WAY (2023+):**
```
Customer → OAuth → Customer Account API → Authenticated operations
```

### Customer Account API Features

- Customer login/logout
- View order history
- Manage addresses
- Update profile
- OAuth-based authentication

### Implementation

```typescript
// Customer authentication now uses OAuth!
const customerAuthUrl = `https://shopify.com/${shop}/auth/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `scope=openid email&` +
  `response_type=code&` +
  `redirect_uri=${REDIRECT_URI}`
```

## Option 3: Hydrogen (Recommended for New Projects)

Shopify's official framework handles all of this automatically:
- Storefront API integration
- Customer Account API
- OAuth flows
- Session management

---

## What You Actually Need

Based on your app (custom Next.js storefront), here's what you need:

### For Public Operations (Products, Collections, Cart)

**Use: Storefront API with Public Token**

```env
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_public_token_here
```

Get it from: Custom app → Storefront API credentials

### For Admin Operations (Customer management, Orders)

**Use: Admin API with OAuth**

```env
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
```

Get it from: Custom app → Admin API credentials

### For Customer Authentication (Login, Orders, Profile)

**Use: Customer Account API with OAuth**

This is NEW and separate from Admin API OAuth!

---

## Updated Architecture

```
Your Next.js App
│
├── Public Storefront (No login required)
│   ├── Browse products → Storefront API + Public Token ✅
│   ├── View collections → Storefront API + Public Token ✅
│   └── Add to cart → Storefront API + Public Token ✅
│
├── Customer Portal (Login required)
│   ├── Customer login → Customer Account API + OAuth 🆕
│   ├── View orders → Customer Account API + OAuth 🆕
│   └── Edit profile → Customer Account API + OAuth 🆕
│
└── Admin Operations (Backend only)
    ├── Create customers → Admin API + OAuth ✅
    ├── Manage orders → Admin API + OAuth ✅
    └── Store settings → Admin API + OAuth ✅
```

---

## What's "Legacy"?

You're right that some things are legacy:

### ❌ LEGACY (Don't use):
- Multipass (being replaced by Customer Account API)
- Customer REST API for authentication
- Shopify.com/account pages (old customer portal)

### ✅ CURRENT (Still valid):
- Storefront API with public access token
- Admin API with OAuth (what we implemented)
- Customer Account API with OAuth (new standard)

---

## Quick Fix for Your App

Let me check what you actually have access to and update the implementation accordingly.

### Question: What's your use case?

1. **Just browsing products** (no customer login)
   - Need: Storefront API public token only
   - Can get from: Custom app → Storefront API

2. **Customer login + orders**
   - Need: Customer Account API OAuth
   - More complex implementation

3. **Admin operations** (what we implemented)
   - Need: Admin API OAuth ✅ Already done!

Let me update the implementation based on what you actually have access to...
