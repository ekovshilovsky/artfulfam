import type {AppLoadContext} from '@shopify/hydrogen/oxygen';

/**
 * Check if the store is password protected
 * This queries the shop information to determine if password protection is enabled
 */
export async function isStorePasswordProtected(
  context: AppLoadContext,
): Promise<boolean> {
  try {
    const {storefront} = context;
    
    // Query shop settings
    const {shop} = await storefront.query(SHOP_INFO_QUERY);
    
    // The shop query will return limited info if password protected
    // We can also check for specific fields that indicate password protection
    return shop?.paymentSettings === null || !shop?.primaryDomain;
  } catch (error) {
    // If the query fails, assume not password protected to avoid blocking access
    console.error('Error checking store password protection:', error);
    return false;
  }
}

/**
 * Check if user has store access via cookie
 */
export function hasStoreAccessCookie(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return false;
  
  // Shopify sets a 'storefront_digest' cookie when password is entered correctly
  return cookieHeader.includes('storefront_digest=');
}

const SHOP_INFO_QUERY = `#graphql
  query ShopInfo {
    shop {
      name
      primaryDomain {
        url
      }
      paymentSettings {
        enabledPresentmentCurrencies
      }
    }
  }
` as const;
