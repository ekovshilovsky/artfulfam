# Environment Variables Documentation

## Password Protection Configuration

This application uses environment variables to control store password protection, replacing the legacy Shopify Admin API-based mechanism.

### Environment Variables

#### `STORE_PASSWORD_ENABLED`
- **Type:** String (`"true"` or `"false"`)
- **Default:** `"false"`
- **Description:** Controls whether password protection is enabled for the store
- **Usage:** Set to `"true"` to require users to enter a password before accessing the store

#### `SHOPIFY_STORE_PASSWORD`
- **Type:** String
- **Required:** Yes, when `STORE_PASSWORD_ENABLED` is `"true"`
- **Description:** The password that users must enter to access the store
- **Security:** This value should be kept secret and not committed to version control

### Implementation Details

#### Previous (Legacy) Mechanism
The legacy implementation checked Shopify's built-in password protection status via the Admin API:
- Made API calls to `shop.json` endpoint
- Checked the `password_enabled` field
- Required `SHOPIFY_ADMIN_ACCESS_TOKEN` with `read_shop_data` scope
- Tightly coupled to Shopify's store settings

#### Current (Environment Variable) Mechanism
The new implementation uses application-level environment variables:
- Checks `STORE_PASSWORD_ENABLED` environment variable
- Validates against `SHOPIFY_STORE_PASSWORD` environment variable
- Independent of Shopify's store settings
- Faster (no API calls required)
- More flexible and easier to configure

### Configuration Flow

1. **Password Protection Check** (`checkStoreAccessAction`)
   - Checks if `STORE_PASSWORD_ENABLED === "true"`
   - Verifies `SHOPIFY_STORE_PASSWORD` is configured
   - Only enables protection if both conditions are met
   - Results are cached for 5 minutes to improve performance

2. **Password Validation** (`validateStorePasswordAction`)
   - Compares user input against `SHOPIFY_STORE_PASSWORD`
   - Sets a secure HTTP-only cookie on successful validation
   - Cookie expires after 24 hours

3. **Access Control** (`app/page.tsx`)
   - Checks password protection status
   - If protected, verifies user has valid access cookie
   - Shows coming soon page if access denied
   - Shows main store if access granted or protection disabled

### Migration Guide

To migrate from the legacy Shopify Admin API mechanism to the new environment variable mechanism:

1. Set `STORE_PASSWORD_ENABLED="true"` in your environment variables
2. Set `SHOPIFY_STORE_PASSWORD` to your desired password
3. Deploy the updated application
4. Remove any Shopify store-level password protection settings (optional)

### Example Configuration

```bash
# .env.local or Vercel Environment Variables

# Enable password protection
STORE_PASSWORD_ENABLED=true

# Set the store password
SHOPIFY_STORE_PASSWORD=MySecurePassword123

# Other required Shopify variables
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token
```

### Security Considerations

1. **Never commit passwords to version control**
   - Use `.env.local` for local development
   - Use platform environment variables for production

2. **Use strong passwords**
   - Minimum 12 characters recommended
   - Include letters, numbers, and special characters

3. **Cookie security**
   - Cookies are HTTP-only (not accessible via JavaScript)
   - Cookies are secure in production (HTTPS only)
   - Cookies expire after 24 hours

4. **Cache considerations**
   - Password status is cached for 5 minutes
   - Server restart or cache expiration will re-check environment variables
   - To immediately apply changes, restart the application

### Benefits

1. **Performance:** No API calls to Shopify for password checks
2. **Flexibility:** Control access independently of Shopify settings
3. **Simplicity:** Easier to configure and maintain
4. **Security:** Environment variables are more secure than API-based checks
5. **Cost:** Reduces API usage and potential rate limiting
