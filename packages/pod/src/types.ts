/**
 * POD Provider Types
 */

export type ProviderKey = 'printful' | 'printify' | 'gooten';

export interface NormalizedTemplate {
  providerKey: ProviderKey;
  providerTemplateId: string;
  name: string;
  description?: string;
  category: string;
  imageUrl?: string;
  variants: NormalizedVariant[];
}

export interface NormalizedVariant {
  providerVariantId: string;
  name: string;
  color?: string;
  size?: string;
  baseCost: number; // cents
  retailPrice?: number; // cents, suggested retail
  inStock: boolean;
}

export interface CatalogSyncResult {
  provider: ProviderKey;
  templatesCount: number;
  variantsCount: number;
  syncedAt: Date;
  errors: string[];
}

/**
 * Abstract POD provider adapter interface
 */
export interface PodAdapter {
  readonly providerKey: ProviderKey;

  /**
   * Sync the full catalog from the provider
   */
  syncCatalog(): Promise<CatalogSyncResult>;

  /**
   * Get all templates from the provider
   */
  getTemplates(): Promise<NormalizedTemplate[]>;

  /**
   * Get a specific template by provider ID
   */
  getTemplate(providerTemplateId: string): Promise<NormalizedTemplate | null>;

  /**
   * Create an order with the provider (for fulfillment)
   */
  createOrder(order: CreateOrderInput): Promise<CreateOrderResult>;
}

export interface CreateOrderInput {
  externalId: string; // Our order ID
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    providerVariantId: string;
    quantity: number;
    files: Array<{
      type: 'front' | 'back' | 'label_inside' | 'label_outside';
      url: string;
    }>;
  }>;
}

export interface CreateOrderResult {
  success: boolean;
  providerOrderId?: string;
  error?: string;
}
