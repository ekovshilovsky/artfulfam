/**
 * Printful POD Adapter
 */

import type {
  PodAdapter,
  NormalizedTemplate,
  CatalogSyncResult,
  CreateOrderInput,
  CreateOrderResult,
} from '../types';

export interface PrintfulConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PrintfulAdapter implements PodAdapter {
  readonly providerKey = 'printful' as const;
  private readonly config: PrintfulConfig;
  private readonly baseUrl: string;

  constructor(config: PrintfulConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.printful.com';
  }

  async syncCatalog(): Promise<CatalogSyncResult> {
    const templates = await this.getTemplates();
    const variantsCount = templates.reduce(
      (acc, t) => acc + t.variants.length,
      0
    );

    return {
      provider: this.providerKey,
      templatesCount: templates.length,
      variantsCount,
      syncedAt: new Date(),
      errors: [],
    };
  }

  async getTemplates(): Promise<NormalizedTemplate[]> {
    // TODO: Implement actual Printful API call
    // GET /products - returns catalog products
    //
    // const response = await fetch(`${this.baseUrl}/products`, {
    //   headers: { Authorization: `Bearer ${this.config.apiKey}` },
    // });
    // const data = await response.json();
    // return this.normalizeProducts(data.result);

    // Placeholder return
    return [];
  }

  async getTemplate(
    providerTemplateId: string
  ): Promise<NormalizedTemplate | null> {
    // TODO: Implement actual Printful API call
    // GET /products/{id} - returns single product with variants
    //
    // const response = await fetch(`${this.baseUrl}/products/${providerTemplateId}`, {
    //   headers: { Authorization: `Bearer ${this.config.apiKey}` },
    // });
    // const data = await response.json();
    // return this.normalizeProduct(data.result);

    void providerTemplateId;
    return null;
  }

  async createOrder(order: CreateOrderInput): Promise<CreateOrderResult> {
    // TODO: Implement actual Printful API call
    // POST /orders - creates a new order
    //
    // const response = await fetch(`${this.baseUrl}/orders`, {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${this.config.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(this.transformOrder(order)),
    // });
    // const data = await response.json();

    void order;
    return {
      success: false,
      error: 'Not implemented',
    };
  }
}
