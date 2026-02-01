# Database Architecture Review & Configuration Recommendations

## Executive Summary

This codebase is a **Shopify Hydrogen storefront** that uses Shopify's managed infrastructure for data storage rather than a traditional self-managed database. As such, traditional Row Level Security (RLS) policies (which apply to PostgreSQL/Supabase) are **not directly applicable** to your current architecture.

However, this document outlines:
1. Current architecture analysis
2. Equivalent security measures for your Shopify-based stack
3. Recommended configurations for enhanced security
4. Future considerations if you add a traditional database (e.g., Supabase)

---

## 1. Current Architecture Analysis

### Data Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Your Application                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (React/React Router)                                      │
│      ↓                                                              │
│  Hydrogen Server (Oxygen Workers)                                   │
│      ↓                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ Storefront API  │  │   Admin API     │  │ In-Memory State  │    │
│  │   (GraphQL)     │  │ (GraphQL/REST)  │  │  (OAuth Tokens)  │    │
│  │ - Products      │  │ - Customers     │  │  - Broker tokens │    │
│  │ - Collections   │  │ - Orders        │  │  - OAuth state   │    │
│  │ - Cart          │  │ - PII Access    │  │                  │    │
│  └────────┬────────┘  └────────┬────────┘  └──────────────────┘    │
└───────────│─────────────────────│────────────────────────────────────┘
            │                     │
            ↓                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   Shopify Infrastructure                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Shopify Database                           │  │
│  │  - Customers (email, phone, addresses, orders)               │  │
│  │  - Products, Variants, Inventory                              │  │
│  │  - Orders, Transactions                                       │  │
│  │  - Built-in access controls (API scopes, customer auth)      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Data Models

| Model | Storage | Access Method | Security |
|-------|---------|---------------|----------|
| Customers | Shopify | Admin API / Storefront API | Scope-based |
| Products | Shopify | Storefront API | Public |
| Orders | Shopify | Customer token + Storefront | Token-scoped |
| Cart | Shopify | Storefront API | Session-bound |
| Artists | In-memory (TS) | Direct import | Code-level |
| Sessions | Cookie | `HydrogenSession` | HMAC-signed |

---

## 2. Why Traditional RLS Doesn't Apply

Row Level Security (RLS) is a **PostgreSQL feature** that restricts which rows users can access based on policies. Your current architecture:

- ❌ Does not use PostgreSQL
- ❌ Does not use Supabase
- ❌ Does not have a self-managed database
- ✅ Uses Shopify's API-based data access with built-in security

### Shopify's Equivalent Security Model

| RLS Concept | Shopify Equivalent | Your Implementation |
|-------------|-------------------|---------------------|
| Row-level read policies | Customer access tokens | `customerAccessToken` in session |
| Row-level write policies | API scope restrictions | `read_customers`, `write_customers` |
| User isolation | Token-scoped queries | Storefront API auto-filters by customer |
| Admin bypass | Admin API tokens | `PRIVATE_ADMIN_API_TOKEN` |

---

## 3. Current Security Configuration (Already Implemented)

### ✅ Session Management (server.ts:95-150)

```typescript
// Current implementation - properly configured
const storage = createCookieSessionStorage({
  cookie: {
    name: 'session',
    httpOnly: true,     // ✅ Prevents XSS access
    path: '/',
    sameSite: 'lax',    // ✅ CSRF protection
    secrets,            // ✅ HMAC signing
  },
});
```

### ✅ HMAC-Signed Tokens (signup-token.server.ts)

```typescript
// Opaque token pattern - good security
signupToken = {
  v: 1,
  iat: timestamp,
  exp: timestamp + 900,  // 15 minute TTL
  shop: string,
  email: string,
  customerId?: string,
  allowPhoneCapture?: boolean  // Critical access control flag
}
```

### ✅ Broker Authentication (broker-auth.server.ts)

```typescript
// Request signing with replay protection
signature = HMAC_SHA256(secret, `${timestamp}.${shop}.${body}`)
// ±5 minute skew protection
```

### ✅ Timing-Safe Comparisons

All HMAC verifications use timing-safe comparison to prevent side-channel attacks.

---

## 4. Recommended Configuration Enhancements

### 4.1 Environment Variables (Required)

Create/verify your `.env` configuration:

```bash
# ===========================================
# CRITICAL SECRETS (Server-Only)
# ===========================================

# Required: Session cookie signing
SESSION_SECRET=<generate-256-bit-random-string>

# Required for Admin API access (choose one approach):
# Option A: Static token (simpler, recommended for single-shop)
PRIVATE_ADMIN_API_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_API_SHOP=your-store.myshopify.com

# Option B: OAuth flow (for multi-shop or dynamic access)
ADMIN_BROKER_ENABLED=true
SHOPIFY_ADMIN_API_KEY=your-api-key
SHOPIFY_ADMIN_API_SECRET=your-api-secret
SHOPIFY_ADMIN_SCOPES=read_customers,write_customers

# Required for signup token signing
SIGNUP_TOKEN_SECRET=<generate-256-bit-random-string>

# Optional: Inter-service broker authentication
BROKER_SHARED_SECRET=<generate-256-bit-random-string>
BROKER_BASE_URL=https://your-broker.example.com

# ===========================================
# PUBLIC VARIABLES (Safe to expose)
# ===========================================
PUBLIC_STORE_DOMAIN=your-store.myshopify.com

# ===========================================
# STOREFRONT API (Auto-configured by Hydrogen)
# ===========================================
PUBLIC_STOREFRONT_API_TOKEN=<storefront-api-token>
```

### 4.2 Generate Secure Secrets

Run this command to generate cryptographically secure secrets:

```bash
# Generate a 256-bit secret (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or for Cloudflare Workers environment
openssl rand -hex 32
```

**Important**: Each secret should be unique. Don't reuse the same value for multiple variables.

### 4.3 Shopify Admin API Scopes Configuration

Configure these scopes in your Shopify app:

| Scope | Purpose | Required For |
|-------|---------|--------------|
| `read_customers` | Search/lookup customers | Email signup flow |
| `write_customers` | Create/update customers | Customer creation, SMS consent |
| `read_orders` | View customer orders | (Future) Order history |
| `read_products` | Product catalog | (Covered by Storefront API) |

### 4.4 Cookie Security Enhancements

Add these additional cookie security configurations in production:

```typescript
// server.ts - Enhanced cookie configuration
const storage = createCookieSessionStorage({
  cookie: {
    name: '__Host-session',  // Stricter cookie naming (requires HTTPS)
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    path: '/',
    sameSite: 'strict',  // Stricter CSRF protection
    secrets,
    maxAge: 60 * 60 * 24,  // 24 hour expiry
  },
});
```

### 4.5 Rate Limiting (Recommended)

Implement rate limiting on sensitive endpoints:

```typescript
// Example: Rate limiting for signup endpoints
// Add to api.customer-signup.tsx and api.update-customer-sms.tsx

const RATE_LIMIT = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,      // 10 requests per window per IP
};

// Cloudflare Workers approach using KV or Durable Objects
async function checkRateLimit(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate:signup:${ip}`;
  // Implementation depends on your KV/DO setup
  return true; // or throw if rate limited
}
```

---

## 5. Future Database Considerations (If Adding Supabase)

If you add a Supabase database for features like:
- User-generated content (reviews, wishlists)
- Artist profiles beyond static data
- Analytics/metrics storage
- Custom application data

Here are the RLS policies you should implement:

### 5.1 Example Schema & RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- WISHLISTS TABLE
-- ===========================================
CREATE TABLE wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id TEXT NOT NULL,  -- Shopify customer GID
  product_id TEXT NOT NULL,   -- Shopify product GID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Policy: Users can only read their own wishlists
CREATE POLICY "Users can view own wishlists"
  ON wishlists FOR SELECT
  USING (customer_id = current_setting('app.customer_id', true));

-- Policy: Users can only insert to their own wishlists
CREATE POLICY "Users can add to own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (customer_id = current_setting('app.customer_id', true));

-- Policy: Users can only delete from their own wishlists
CREATE POLICY "Users can remove from own wishlists"
  ON wishlists FOR DELETE
  USING (customer_id = current_setting('app.customer_id', true));

-- ===========================================
-- REVIEWS TABLE
-- ===========================================
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy: Anyone can read approved reviews (public)
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

-- Policy: Users can view their own reviews (even unapproved)
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (customer_id = current_setting('app.customer_id', true));

-- Policy: Users can insert reviews (one per product)
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    customer_id = current_setting('app.customer_id', true)
    AND NOT EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.customer_id = customer_id
      AND r.product_id = reviews.product_id
    )
  );

-- Policy: Users can update their own unapproved reviews
CREATE POLICY "Users can update own unapproved reviews"
  ON reviews FOR UPDATE
  USING (
    customer_id = current_setting('app.customer_id', true)
    AND is_approved = false
  );

-- ===========================================
-- ARTIST PROFILES (If moving from static data)
-- ===========================================
CREATE TABLE artist_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id TEXT UNIQUE,  -- Optional: linked Shopify customer
  name TEXT NOT NULL,
  bio TEXT,
  role TEXT CHECK (role IN ('student', 'teacher')),
  mediums TEXT[],
  styles TEXT[],
  teacher_id UUID REFERENCES artist_profiles(id),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy: Anyone can view public profiles
CREATE POLICY "Anyone can view public profiles"
  ON artist_profiles FOR SELECT
  USING (is_public = true);

-- Policy: Users can view and edit their own profile
CREATE POLICY "Users can manage own profile"
  ON artist_profiles FOR ALL
  USING (customer_id = current_setting('app.customer_id', true));

-- ===========================================
-- ADMIN BYPASS (for moderation)
-- ===========================================
-- Create admin role
CREATE ROLE artfulfam_admin;

-- Grant admin full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO artfulfam_admin;

-- Bypass RLS for admins
ALTER TABLE wishlists FORCE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "Admin bypass" ON wishlists FOR ALL TO artfulfam_admin USING (true);
CREATE POLICY "Admin bypass" ON reviews FOR ALL TO artfulfam_admin USING (true);
CREATE POLICY "Admin bypass" ON artist_profiles FOR ALL TO artfulfam_admin USING (true);
```

### 5.2 Supabase Client Configuration

```typescript
// lib/supabase.server.ts
import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(customerAccessToken?: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public',
      },
      global: {
        headers: customerAccessToken ? {
          // Pass customer ID for RLS
          'x-customer-id': customerAccessToken,
        } : {},
      },
    }
  );

  return supabase;
}

// In your Supabase database, create a function to set the customer context:
// CREATE OR REPLACE FUNCTION set_customer_context(customer_id TEXT)
// RETURNS void AS $$
// BEGIN
//   PERFORM set_config('app.customer_id', customer_id, true);
// END;
// $$ LANGUAGE plpgsql;
```

---

## 6. Security Checklist

### Immediate Actions

- [ ] Verify all secrets are unique and properly generated (256-bit minimum)
- [ ] Ensure `SESSION_SECRET` is set in production environment
- [ ] Ensure `SIGNUP_TOKEN_SECRET` is set and unique
- [ ] Verify Shopify Admin API scopes match requirements
- [ ] Review cookie settings for production (`secure: true`, HTTPS)

### Recommended Enhancements

- [ ] Implement rate limiting on `/api/customer-signup` and `/api/update-customer-sms`
- [ ] Add request logging (without PII) for security auditing
- [ ] Set up alerting for failed authentication attempts
- [ ] Consider using `__Host-` cookie prefix for stricter security
- [ ] Implement CORS headers if serving API to other domains

### Future Considerations

- [ ] If adding Supabase: Implement RLS policies before storing any user data
- [ ] If adding Supabase: Enable connection pooling with `pgbouncer`
- [ ] If adding user-generated content: Plan moderation workflow
- [ ] Regular secret rotation strategy (quarterly recommended)

---

## 7. Summary

Your current architecture leverages **Shopify's built-in security model** rather than traditional database RLS. The security patterns already implemented (HMAC tokens, timing-safe comparisons, scope-based API access) are **appropriate and well-designed** for this architecture.

**Key Points:**

1. **RLS is not needed** for your current Shopify-based data storage
2. **Shopify handles data isolation** via API tokens and scopes
3. **Your token-based authentication** (`signupToken`, broker auth) is correctly implemented
4. **If you add Supabase**, implement the RLS policies in Section 5 before storing any user data

The main configuration focus should be on:
- Proper secret management (unique, high-entropy secrets)
- Cookie security settings for production
- Rate limiting for abuse prevention
- Logging and monitoring for security awareness
