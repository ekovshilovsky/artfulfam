/**
 * Multi-POD Provider Type Definitions
 *
 * Unified types for working with multiple print-on-demand providers
 * (Printful, Gelato, Gooten, SPOD, etc.)
 */

// ============================================================================
// Provider Configuration
// ============================================================================

export type ProviderSlug =
  | "printful"
  | "gelato"
  | "gooten"
  | "spod"
  | "prodigi"
  | "customcat";

export interface PODProviderCapabilities {
  /** Can generate product mockups */
  mockupGeneration: boolean;
  /** Available mockup styles */
  mockupStyles: string[];
  /** Special finishes (gold_foil, embroidery, etc.) */
  specialFinishes: string[];
  /** Product categories offered */
  productCategories: string[];
  /** Supports async webhooks */
  webhookSupport: boolean;
  /** API version */
  apiVersion: string;
  /** Requires polling for mockup status */
  asyncMockups: boolean;
  /** Supports bulk operations */
  bulkOperations: boolean;
  /** API rate limit (requests per minute) */
  apiRateLimit: number;
}

export interface PODProviderConfig {
  slug: ProviderSlug;
  name: string;
  apiBaseUrl: string;
  capabilities: PODProviderCapabilities;
  /** Provider-specific settings */
  settings?: Record<string, unknown>;
}

// ============================================================================
// Catalog Types (Normalized across providers)
// ============================================================================

export interface CatalogProduct {
  /** Provider's internal product ID */
  providerId: string;
  /** Which provider this is from */
  providerSlug: ProviderSlug;
  /** Product name */
  name: string;
  /** Product description */
  description: string;
  /** Category (apparel, prints, home_decor, etc.) */
  category: string;
  /** Thumbnail image URL */
  thumbnailUrl: string;
  /** Base price before customization */
  basePrice: Money;
  /** Available special finishes */
  specialFinishes?: string[];
  /** Regions where product is available */
  availableRegions: string[];
  /** Raw provider data for reference */
  rawData?: unknown;
}

export interface CatalogVariant {
  /** Provider's internal variant ID */
  providerId: string;
  /** Parent product ID */
  productId: string;
  /** Provider slug */
  providerSlug: ProviderSlug;
  /** Variant name (e.g., "Black / XL") */
  name: string;
  /** Size (if applicable) */
  size?: string;
  /** Color (if applicable) */
  color?: string;
  /** Color hex code */
  colorHex?: string;
  /** SKU */
  sku?: string;
  /** Variant price */
  price: Money;
  /** Is in stock */
  inStock: boolean;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Raw provider data */
  rawData?: unknown;
}

export interface Money {
  amount: number;
  currency: string;
}

// ============================================================================
// Mockup Types
// ============================================================================

export type MockupStyle =
  // Common styles
  | "front"
  | "back"
  | "left"
  | "right"
  | "lifestyle"
  | "flat"
  | "closeup"
  // Printful specific
  | "model_male"
  | "model_female"
  | "studio"
  // Gelato specific
  | "detail"
  | "room_context"
  | "packaging";

export type SpecialFinish =
  // Gelato
  | "gold_foil"
  | "silver_foil"
  | "spot_uv"
  | "embossing"
  | "fine_art"
  // Printful
  | "embroidery"
  | "dtg"
  | "sublimation"
  // SPOD
  | "flex"
  | "flock"
  | "digital_direct"
  // Prodigi
  | "giclée"
  | "metallic"
  | "canvas_wrap";

export interface MockupRequest {
  /** Provider's product ID */
  productId: string;
  /** Specific variant IDs (optional, all if not specified) */
  variantIds?: string[];
  /** URL to the artwork file */
  artworkUrl: string;
  /** Placement on product (front, back, sleeve, etc.) */
  placement: string;
  /** Desired mockup styles */
  styles: MockupStyle[];
  /** Special finish to apply (provider-specific) */
  specialFinish?: SpecialFinish;
  /** Output format */
  format?: "jpg" | "png";
  /** Output width in pixels */
  width?: number;
}

export interface MockupJob {
  /** Our internal job ID */
  jobId: string;
  /** Provider's task/job ID */
  providerTaskId: string;
  /** Provider slug */
  providerSlug: ProviderSlug;
  /** Job status */
  status: MockupJobStatus;
  /** Created timestamp */
  createdAt: Date;
}

export type MockupJobStatus =
  | "pending"
  | "submitted"
  | "processing"
  | "completed"
  | "failed";

export interface MockupJobResult {
  /** Provider's task ID */
  providerTaskId: string;
  /** Current status */
  status: MockupJobStatus;
  /** Generated mockups (if completed) */
  mockups?: GeneratedMockup[];
  /** Error message (if failed) */
  error?: string;
  /** Progress percentage (0-100) */
  progress?: number;
}

export interface GeneratedMockup {
  /** Mockup style */
  style: MockupStyle;
  /** Placement */
  placement: string;
  /** Variant IDs this mockup applies to */
  variantIds: string[];
  /** Mockup image URL (provider-hosted) */
  imageUrl: string;
  /** Special finish applied */
  specialFinish?: SpecialFinish;
  /** Extra mockups (different angles, etc.) */
  extras?: Array<{
    title: string;
    url: string;
    option?: string;
    optionGroup?: string;
  }>;
}

// ============================================================================
// Order Types (Future)
// ============================================================================

export interface OrderRequest {
  /** External order ID (our system) */
  externalId: string;
  /** Shipping address */
  shippingAddress: Address;
  /** Line items */
  items: OrderItem[];
  /** Retail costs (for packing slip) */
  retailCosts?: {
    subtotal: Money;
    shipping: Money;
    tax: Money;
    total: Money;
  };
}

export interface OrderItem {
  /** Provider's variant ID */
  variantId: string;
  /** Quantity */
  quantity: number;
  /** Print files */
  files: Array<{
    type: string; // 'front', 'back', etc.
    url: string;
  }>;
  /** Special finish */
  specialFinish?: SpecialFinish;
}

export interface Address {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  stateCode?: string;
  countryCode: string;
  postalCode: string;
  phone?: string;
  email?: string;
}

export interface Order {
  /** Provider's order ID */
  providerId: string;
  /** Our external ID */
  externalId: string;
  /** Provider slug */
  providerSlug: ProviderSlug;
  /** Order status */
  status: OrderStatus;
  /** Shipping info */
  shipping?: {
    carrier: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
  };
  /** Created timestamp */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
}

export type OrderStatus =
  | "draft"
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "failed";

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookEventType =
  | "mockup.completed"
  | "mockup.failed"
  | "order.created"
  | "order.updated"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "order.failed";

export interface WebhookEvent {
  /** Event type */
  type: WebhookEventType;
  /** Provider slug */
  providerSlug: ProviderSlug;
  /** Event timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: unknown;
  /** Raw payload for debugging */
  rawPayload: unknown;
}

// ============================================================================
// List/Query Options
// ============================================================================

export interface ListProductsOptions {
  /** Category filter */
  category?: string;
  /** Search query */
  search?: string;
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

export interface ListVariantsOptions {
  /** Filter by color */
  color?: string;
  /** Filter by size */
  size?: string;
  /** Only in-stock */
  inStockOnly?: boolean;
}
