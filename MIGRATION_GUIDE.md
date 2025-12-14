# Migration Guide: OAuth Authorization Code Grant

This guide helps you migrate from static Shopify access tokens to OAuth authorization code grant flow.

## What Changed?

### Before (Static Tokens)
The app previously used static access tokens:
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - for Admin API
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` - for Storefront API

### After (OAuth Flow)
The app now uses:
- **OAuth flow** with `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` for Admin API
- **Static token** `SHOPIFY_STOREFRONT_ACCESS_TOKEN` for Storefront API (still required)

## Migration Steps

### 1. Update Environment Variables

**Old `.env` file:**
```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxx
```

**New `.env` file:**
```env
# OAuth credentials (new)
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret

# Keep existing variables
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxx

# Add app URL for OAuth redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Create a Custom App in Shopify

1. Go to **Shopify Admin > Settings > Apps and sales channels**
2. Click **Develop apps**
3. Click **Create an app**
4. Give it a name (e.g., "My Store App")
5. Click **Create app**

### 3. Configure API Scopes

1. Go to **Configuration** tab
2. Under **Admin API access scopes**, select:
   - `read_products`
   - `read_customers`
   - `write_customers`
   - `read_orders`
   - Any other scopes your app needs
3. Click **Save**

### 4. Get OAuth Credentials

1. Go to **API credentials** tab
2. Copy the **Client ID** (API key) → Set as `SHOPIFY_CLIENT_ID`
3. Click to reveal **Client secret** → Set as `SHOPIFY_CLIENT_SECRET`
   - ⚠️ **Important**: You can only view this once! Save it securely.

### 5. Configure Storefront API (if not already done)

1. Go to **Configuration** tab
2. Under **Storefront API access scopes**, select required scopes
3. Click **Save**
4. Go to **API credentials** tab
5. Copy **Storefront API access token** → Set as `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

### 6. Configure OAuth Redirect URLs

1. In your app settings, go to **Configuration**
2. Under **App URL**, set:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Under **Allowed redirection URL(s)**, add:
   - Development: `http://localhost:3000/api/auth/shopify/callback`
   - Production: `https://your-domain.com/api/auth/shopify/callback`
4. Click **Save**

### 7. Authenticate Your App

After updating environment variables and deploying:

1. Visit: `http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com`
2. You'll be redirected to Shopify to approve the app
3. After approval, you'll be redirected back and the access token will be stored
4. Your app is now authenticated!

### 8. Remove Old Environment Variable (Optional)

Once OAuth is working, you can remove:
```env
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx  # No longer needed
```

## Code Changes

### Automatic Fallback

The app now automatically falls back to `SHOPIFY_ADMIN_ACCESS_TOKEN` if no OAuth token is found. This means:

- ✅ OAuth tokens are checked first
- ✅ Falls back to static token if OAuth not configured
- ✅ Zero downtime migration

### Files Updated

1. **`lib/shopify/oauth.ts`** (new)
   - OAuth flow implementation
   - Token management
   - HMAC verification

2. **`app/api/auth/shopify/install/route.ts`** (new)
   - Initiates OAuth flow

3. **`app/api/auth/shopify/callback/route.ts`** (new)
   - Handles OAuth callback

4. **`lib/shopify/actions.ts`**
   - Updated to use `shopifyAdminFetch()` from OAuth module
   - Automatically uses OAuth tokens

5. **`lib/shopify/index.ts`**
   - Updated to use `getStorefrontAccessToken()` helper
   - Still requires `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

6. **`app/api/update-customer-sms/route.ts`**
   - Updated to use `getAccessToken()` from OAuth module

## Testing

### Test OAuth Flow

1. Clear cookies in your browser
2. Visit: `http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com`
3. Complete the authorization
4. Check that your app works correctly

### Verify Token Storage

1. Open browser DevTools > Application > Cookies
2. Look for `shopify_access_token` cookie
3. Should be `HttpOnly`, `Secure` (in production), `SameSite=Lax`

### Test Admin API Calls

Try creating a customer or checking store settings to verify Admin API access works.

## Troubleshooting

### "Missing SHOPIFY_CLIENT_ID" Error

**Cause**: Environment variable not set

**Solution**: 
1. Check `.env.local` file exists
2. Verify `SHOPIFY_CLIENT_ID=your_client_id` is set
3. Restart dev server: `npm run dev`

### "Invalid HMAC signature" Error

**Cause**: Client secret mismatch or request tampering

**Solution**:
1. Verify `SHOPIFY_CLIENT_SECRET` matches your app's secret
2. Don't modify the callback URL parameters
3. Check for clock drift between servers

### "No access token available" Error

**Cause**: OAuth flow not completed

**Solution**: Visit the install URL to complete OAuth:
```
http://localhost:3000/api/auth/shopify/install?shop=your-store.myshopify.com
```

### 401 Unauthorized from Admin API

**Cause**: Missing scopes or invalid token

**Solution**:
1. Check you have required scopes in app settings
2. Re-authenticate by visiting install URL
3. Verify cookie is being sent with requests

## Rollback Plan

If you need to rollback to static tokens:

1. Keep `SHOPIFY_ADMIN_ACCESS_TOKEN` in environment variables
2. The app will automatically use it as fallback
3. No code changes needed for rollback

## Production Deployment

### Environment Variables

Make sure to set in your production environment:
```env
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### OAuth URLs

Update your Shopify app configuration with production URLs:
- App URL: `https://your-domain.com`
- Redirect URL: `https://your-domain.com/api/auth/shopify/callback`

### Re-authenticate in Production

After deploying:
```
https://your-domain.com/api/auth/shopify/install?shop=your-store.myshopify.com
```

## Security Notes

- ✅ OAuth tokens stored in HTTP-only cookies
- ✅ CSRF protection with state parameter
- ✅ HMAC signature verification
- ✅ Secure cookies in production
- ✅ Client secret never exposed to client
- ❌ Never commit `.env` or `.env.local` to version control
- ❌ Never share your Client Secret

## Benefits of OAuth

1. **Better Security**: No static tokens in environment
2. **Automatic Refresh**: Tokens don't expire
3. **Scope Management**: Fine-grained permissions
4. **Audit Trail**: Track app installations
5. **User Context**: Know which user authorized

## Need Help?

See the detailed setup guide in: `/lib/shopify/README.md`

Or check Shopify documentation:
https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
