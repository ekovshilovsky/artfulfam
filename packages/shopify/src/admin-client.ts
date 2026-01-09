/**
 * Shopify Admin API client wrapper
 */

export interface ShopifyAdminConfig {
  shop: string;
  accessToken: string;
  apiVersion?: string;
}

export class ShopifyAdminClient {
  private readonly config: ShopifyAdminConfig;
  private readonly apiVersion: string;

  constructor(config: ShopifyAdminConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || '2024-10';
  }

  private get baseUrl(): string {
    return `https://${this.config.shop}/admin/api/${this.apiVersion}`;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.config.accessToken,
    };
  }

  /**
   * Execute a GraphQL query
   */
  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/graphql.json`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify Admin API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data as T;
  }

  /**
   * Create or update a product
   */
  async upsertProduct(input: ProductInput): Promise<{ id: string }> {
    const mutation = `
      mutation productSet($input: ProductSetInput!) {
        productSet(input: $input) {
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const result = await this.graphql<{
      productSet: {
        product: { id: string } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(mutation, { input });

    if (result.productSet.userErrors.length > 0) {
      throw new Error(
        `Product upsert failed: ${result.productSet.userErrors.map((e) => e.message).join(', ')}`
      );
    }

    if (!result.productSet.product) {
      throw new Error('Product upsert returned no product');
    }

    return result.productSet.product;
  }
}

export interface ProductInput {
  title: string;
  descriptionHtml?: string;
  handle?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  variants?: Array<{
    price: string;
    sku?: string;
    inventoryPolicy?: 'DENY' | 'CONTINUE';
  }>;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}
