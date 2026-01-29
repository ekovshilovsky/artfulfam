/**
 * POD Provider Interface
 *
 * Abstract interface that all POD providers must implement.
 * This ensures consistent behavior across Printful, Gelato, etc.
 */

import type {
  ProviderSlug,
  PODProviderCapabilities,
  CatalogProduct,
  CatalogVariant,
  MockupRequest,
  MockupJob,
  MockupJobResult,
  MockupStyle,
  OrderRequest,
  Order,
  OrderStatus,
  WebhookEvent,
  ListProductsOptions,
  ListVariantsOptions,
} from "./types";

export interface PODProvider {
  /** Provider identifier */
  readonly slug: ProviderSlug;

  /** Human-readable name */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: PODProviderCapabilities;

  // ==========================================================================
  // Catalog Methods
  // ==========================================================================

  /**
   * List products from the provider's catalog
   */
  listProducts(options?: ListProductsOptions): Promise<CatalogProduct[]>;

  /**
   * Get a single product by ID
   */
  getProduct(productId: string): Promise<CatalogProduct>;

  /**
   * Get variants for a product
   */
  getProductVariants(
    productId: string,
    options?: ListVariantsOptions
  ): Promise<CatalogVariant[]>;

  /**
   * Get available mockup styles for a product
   */
  getMockupStyles(productId: string): Promise<MockupStyle[]>;

  // ==========================================================================
  // Mockup Methods
  // ==========================================================================

  /**
   * Start mockup generation
   * Returns a job that can be polled for status
   */
  generateMockups(request: MockupRequest): Promise<MockupJob>;

  /**
   * Get mockup job status and results
   */
  getMockupJobStatus(taskId: string): Promise<MockupJobResult>;

  /**
   * Poll for mockup completion (convenience method)
   * Polls until complete/failed or timeout
   */
  waitForMockups(
    taskId: string,
    options?: { maxAttempts?: number; delayMs?: number }
  ): Promise<MockupJobResult>;

  // ==========================================================================
  // Order Methods (Future)
  // ==========================================================================

  /**
   * Create an order for fulfillment
   */
  createOrder(order: OrderRequest): Promise<Order>;

  /**
   * Get order status
   */
  getOrderStatus(orderId: string): Promise<Order>;

  /**
   * Cancel an order (if possible)
   */
  cancelOrder(orderId: string): Promise<boolean>;

  // ==========================================================================
  // Webhook Methods
  // ==========================================================================

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload into normalized event
   */
  parseWebhookEvent(payload: unknown): WebhookEvent;
}

/**
 * Base class with common functionality
 * Providers can extend this for shared logic
 */
export abstract class BasePODProvider implements PODProvider {
  abstract readonly slug: ProviderSlug;
  abstract readonly name: string;
  abstract readonly capabilities: PODProviderCapabilities;

  protected apiKey: string;
  protected baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  // Abstract methods that must be implemented
  abstract listProducts(options?: ListProductsOptions): Promise<CatalogProduct[]>;
  abstract getProduct(productId: string): Promise<CatalogProduct>;
  abstract getProductVariants(
    productId: string,
    options?: ListVariantsOptions
  ): Promise<CatalogVariant[]>;
  abstract getMockupStyles(productId: string): Promise<MockupStyle[]>;
  abstract generateMockups(request: MockupRequest): Promise<MockupJob>;
  abstract getMockupJobStatus(taskId: string): Promise<MockupJobResult>;
  abstract createOrder(order: OrderRequest): Promise<Order>;
  abstract getOrderStatus(orderId: string): Promise<Order>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract verifyWebhook(payload: string, signature: string): boolean;
  abstract parseWebhookEvent(payload: unknown): WebhookEvent;

  /**
   * Default polling implementation
   * Can be overridden by providers with different behavior
   */
  async waitForMockups(
    taskId: string,
    options?: { maxAttempts?: number; delayMs?: number }
  ): Promise<MockupJobResult> {
    const maxAttempts = options?.maxAttempts ?? 30;
    const delayMs = options?.delayMs ?? 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getMockupJobStatus(taskId);

      if (result.status === "completed" || result.status === "failed") {
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(
      `Mockup generation timed out after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 1000}s)`
    );
  }

  /**
   * Helper for making authenticated requests
   */
  protected async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${this.name} API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }
}
