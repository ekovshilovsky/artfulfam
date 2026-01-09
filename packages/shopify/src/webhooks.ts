/**
 * Shopify webhook verification and handling
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Shopify webhook HMAC signature
 *
 * IMPORTANT: This must be called with the raw request body (Buffer or string),
 * not parsed JSON. The signature is computed over the exact bytes received.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  hmacHeader: string,
  apiSecret: string
): boolean {
  const calculatedHmac = createHmac('sha256', apiSecret)
    .update(rawBody)
    .digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(hmacHeader),
      Buffer.from(calculatedHmac)
    );
  } catch {
    return false;
  }
}

export type WebhookTopic =
  | 'orders/create'
  | 'orders/paid'
  | 'orders/cancelled'
  | 'fulfillments/create'
  | 'fulfillments/update'
  | 'refunds/create'
  | 'app/uninstalled';

export interface WebhookPayload {
  topic: WebhookTopic;
  shop: string;
  apiVersion: string;
  webhookId: string;
  data: unknown;
}

/**
 * Parse webhook headers and body into a typed payload
 */
export function parseWebhook(
  headers: Record<string, string | undefined>,
  body: unknown
): WebhookPayload {
  return {
    topic: headers['x-shopify-topic'] as WebhookTopic,
    shop: headers['x-shopify-shop-domain'] || '',
    apiVersion: headers['x-shopify-api-version'] || '',
    webhookId: headers['x-shopify-webhook-id'] || '',
    data: body,
  };
}

export interface OrderWebhookData {
  id: number;
  admin_graphql_api_id: string;
  name: string;
  email: string;
  total_price: string;
  currency: string;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    quantity: number;
    price: string;
  }>;
  shipping_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    address2?: string;
    city: string;
    province_code: string;
    country_code: string;
    zip: string;
    phone?: string;
  };
}

export interface FulfillmentWebhookData {
  id: number;
  admin_graphql_api_id: string;
  order_id: number;
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'error' | 'failure';
  tracking_number?: string;
  tracking_url?: string;
  line_items: Array<{
    id: number;
    quantity: number;
  }>;
}
