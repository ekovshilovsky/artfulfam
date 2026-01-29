/**
 * Printful POD Provider Implementation
 *
 * Implements the PODProvider interface for Printful API v2
 * https://developers.printful.com/docs/
 */

import { BasePODProvider } from "../provider-interface";
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
  WebhookEvent,
  ListProductsOptions,
  ListVariantsOptions,
  GeneratedMockup,
} from "../types";
import { POD_PROVIDER_CONFIGS } from "../provider-factory";
import crypto from "crypto";

// ============================================================================
// Printful API Types
// ============================================================================

interface PrintfulResponse<T> {
  code: number;
  result: T;
  paging?: {
    total: number;
    offset: number;
    limit: number;
  };
}

interface PrintfulCatalogProduct {
  id: number;
  main_category_id: number;
  type: string;
  type_name: string;
  title: string;
  brand: string;
  model: string;
  image: string;
  variant_count: number;
  currency: string;
  files: Array<{
    id: string;
    type: string;
    title: string;
  }>;
  options: Array<{
    id: string;
    title: string;
    type: string;
    values: Record<string, string>;
  }>;
  is_discontinued: boolean;
  description: string;
}

interface PrintfulCatalogVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  color_code2: string | null;
  image: string;
  price: string;
  in_stock: boolean;
  availability_regions: Record<string, string>;
  availability_status: Array<{
    region: string;
    status: string;
  }>;
}

interface PrintfulMockupTask {
  task_key: string;
  status: "pending" | "completed" | "failed";
  mockups?: Array<{
    placement: string;
    variant_ids: number[];
    mockup_url: string;
    extra_mockups?: Array<{
      title: string;
      url: string;
      option: string;
      option_group: string;
    }>;
  }>;
  error?: string;
  printfiles?: Array<{
    variant_ids: number[];
    placement: string;
    url: string;
  }>;
}

interface PrintfulCategory {
  id: number;
  parent_id: number;
  image_url: string;
  catalog_position: number;
  size: string;
  title: string;
}

// ============================================================================
// Printful Provider Implementation
// ============================================================================

export class PrintfulProvider extends BasePODProvider {
  readonly slug: ProviderSlug = "printful";
  readonly name = "Printful";
  readonly capabilities: PODProviderCapabilities;

  constructor(apiKey: string) {
    super(apiKey, "https://api.printful.com");
    this.capabilities = POD_PROVIDER_CONFIGS.printful.capabilities;
  }

  // ==========================================================================
  // Request Helper (Printful-specific response handling)
  // ==========================================================================

  protected override async request<T>(
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

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Printful API error (${response.status}): ${responseText}`
      );
    }

    let payload: PrintfulResponse<T>;
    try {
      payload = JSON.parse(responseText) as PrintfulResponse<T>;
    } catch {
      throw new Error(`Invalid Printful JSON response: ${responseText}`);
    }

    if (payload.code !== 200) {
      throw new Error(`Printful API returned code ${payload.code}`);
    }

    return payload.result;
  }

  // ==========================================================================
  // Catalog Methods
  // ==========================================================================

  async listProducts(options?: ListProductsOptions): Promise<CatalogProduct[]> {
    const params = new URLSearchParams();
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.category) params.set("category_id", options.category);

    const queryString = params.toString();
    const path = `/products${queryString ? `?${queryString}` : ""}`;

    const products = await this.request<PrintfulCatalogProduct[]>(path);

    return products.map((p) => this.normalizeCatalogProduct(p));
  }

  async getProduct(productId: string): Promise<CatalogProduct> {
    const data = await this.request<{
      product: PrintfulCatalogProduct;
      variants: PrintfulCatalogVariant[];
    }>(`/products/${productId}`);

    return this.normalizeCatalogProduct(data.product);
  }

  async getProductVariants(
    productId: string,
    options?: ListVariantsOptions
  ): Promise<CatalogVariant[]> {
    const data = await this.request<{
      product: PrintfulCatalogProduct;
      variants: PrintfulCatalogVariant[];
    }>(`/products/${productId}`);

    let variants = data.variants.map((v) => this.normalizeCatalogVariant(v));

    // Apply filters
    if (options?.color) {
      variants = variants.filter(
        (v) => v.color?.toLowerCase() === options.color?.toLowerCase()
      );
    }
    if (options?.size) {
      variants = variants.filter(
        (v) => v.size?.toLowerCase() === options.size?.toLowerCase()
      );
    }
    if (options?.inStockOnly) {
      variants = variants.filter((v) => v.inStock);
    }

    return variants;
  }

  async getMockupStyles(productId: string): Promise<MockupStyle[]> {
    // Printful uses mockup-generator/printfiles endpoint to get available placements
    const data = await this.request<{
      product_id: number;
      available_placements: Record<
        string,
        {
          placement: string;
          technique: string;
        }
      >;
      printfiles: Array<{
        printfile_id: number;
        width: number;
        height: number;
        dpi: number;
        fill_mode: string;
        can_rotate: boolean;
      }>;
      option_groups: string[];
      options: string[];
    }>(`/mockup-generator/printfiles/${productId}`);

    // Map option_groups to our MockupStyle type
    const styleMap: Record<string, MockupStyle> = {
      Front: "front",
      Back: "back",
      Left: "left",
      Right: "right",
      Lifestyle: "lifestyle",
      "Lifestyle 2": "lifestyle",
      "On Male Model": "model_male",
      "On Female Model": "model_female",
      "Male model": "model_male",
      "Female model": "model_female",
      Closeup: "closeup",
      Flat: "flat",
      Studio: "studio",
    };

    const styles: MockupStyle[] = [];
    for (const group of data.option_groups || []) {
      const mapped = styleMap[group];
      if (mapped && !styles.includes(mapped)) {
        styles.push(mapped);
      }
    }

    return styles.length > 0 ? styles : ["front"]; // Default to front if none found
  }

  // ==========================================================================
  // Mockup Methods
  // ==========================================================================

  async generateMockups(request: MockupRequest): Promise<MockupJob> {
    // Map our styles to Printful option_groups
    const optionGroups = this.mapStylesToOptionGroups(request.styles);

    const body = {
      variant_ids: request.variantIds?.map((id) => parseInt(id, 10)) ?? [],
      format: request.format ?? "png",
      width: request.width ?? 1000,
      files: [
        {
          placement: request.placement,
          image_url: request.artworkUrl,
        },
      ],
      option_groups: optionGroups,
    };

    const task = await this.request<{ task_key: string }>(
      `/mockup-generator/create-task/${request.productId}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return {
      jobId: task.task_key, // Use provider's task_key as our jobId
      providerTaskId: task.task_key,
      providerSlug: this.slug,
      status: "submitted",
      createdAt: new Date(),
    };
  }

  async getMockupJobStatus(taskId: string): Promise<MockupJobResult> {
    const task = await this.request<PrintfulMockupTask>(
      `/mockup-generator/task?task_key=${taskId}`
    );

    const status =
      task.status === "pending"
        ? "processing"
        : task.status === "completed"
          ? "completed"
          : "failed";

    const mockups: GeneratedMockup[] = [];

    if (task.mockups) {
      for (const m of task.mockups) {
        mockups.push({
          style: this.mapPlacementToStyle(m.placement),
          placement: m.placement,
          variantIds: m.variant_ids.map(String),
          imageUrl: m.mockup_url,
          extras: m.extra_mockups?.map((e) => ({
            title: e.title,
            url: e.url,
            option: e.option,
            optionGroup: e.option_group,
          })),
        });
      }
    }

    return {
      providerTaskId: taskId,
      status,
      mockups: mockups.length > 0 ? mockups : undefined,
      error: task.error,
    };
  }

  // ==========================================================================
  // Order Methods
  // ==========================================================================

  async createOrder(order: OrderRequest): Promise<Order> {
    const body = {
      external_id: order.externalId,
      shipping: "STANDARD",
      recipient: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        address1: order.shippingAddress.address1,
        address2: order.shippingAddress.address2,
        city: order.shippingAddress.city,
        state_code: order.shippingAddress.stateCode,
        country_code: order.shippingAddress.countryCode,
        zip: order.shippingAddress.postalCode,
        phone: order.shippingAddress.phone,
        email: order.shippingAddress.email,
      },
      items: order.items.map((item) => ({
        variant_id: parseInt(item.variantId, 10),
        quantity: item.quantity,
        files: item.files.map((f) => ({
          type: f.type,
          url: f.url,
        })),
      })),
      retail_costs: order.retailCosts
        ? {
            subtotal: String(order.retailCosts.subtotal.amount),
            shipping: String(order.retailCosts.shipping.amount),
            tax: String(order.retailCosts.tax.amount),
          }
        : undefined,
    };

    const result = await this.request<{
      id: number;
      external_id: string;
      status: string;
      created: number;
    }>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      providerId: String(result.id),
      externalId: result.external_id,
      providerSlug: this.slug,
      status: this.mapPrintfulOrderStatus(result.status),
      createdAt: new Date(result.created * 1000),
      updatedAt: new Date(),
    };
  }

  async getOrderStatus(orderId: string): Promise<Order> {
    const result = await this.request<{
      id: number;
      external_id: string;
      status: string;
      created: number;
      updated: number;
      shipping: string;
      shipments?: Array<{
        carrier: string;
        service: string;
        tracking_number: string;
        tracking_url: string;
        ship_date: string;
        estimated_delivery_date?: string;
      }>;
    }>(`/orders/${orderId}`);

    const latestShipment = result.shipments?.[0];

    return {
      providerId: String(result.id),
      externalId: result.external_id,
      providerSlug: this.slug,
      status: this.mapPrintfulOrderStatus(result.status),
      shipping: latestShipment
        ? {
            carrier: latestShipment.carrier,
            trackingNumber: latestShipment.tracking_number,
            trackingUrl: latestShipment.tracking_url,
            estimatedDelivery: latestShipment.estimated_delivery_date
              ? new Date(latestShipment.estimated_delivery_date)
              : undefined,
          }
        : undefined,
      createdAt: new Date(result.created * 1000),
      updatedAt: new Date(result.updated * 1000),
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.request(`/orders/${orderId}`, {
        method: "DELETE",
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Webhook Methods
  // ==========================================================================

  verifyWebhook(payload: string, signature: string): boolean {
    const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("PRINTFUL_WEBHOOK_SECRET not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("base64");

    return signature === expectedSignature;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const data = payload as {
      type: string;
      created: number;
      retries: number;
      store: number;
      data: {
        order?: { id: number; external_id: string; status: string };
        shipment?: {
          carrier: string;
          tracking_number: string;
          tracking_url: string;
        };
      };
    };

    const typeMap: Record<string, WebhookEvent["type"]> = {
      package_shipped: "order.shipped",
      package_returned: "order.cancelled",
      order_created: "order.created",
      order_updated: "order.updated",
      order_failed: "order.failed",
      order_canceled: "order.cancelled",
    };

    return {
      type: typeMap[data.type] ?? "order.updated",
      providerSlug: this.slug,
      timestamp: new Date(data.created * 1000),
      data: data.data,
      rawPayload: payload,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private normalizeCatalogProduct(p: PrintfulCatalogProduct): CatalogProduct {
    return {
      providerId: String(p.id),
      providerSlug: this.slug,
      name: p.title,
      description: p.description || "",
      category: p.type_name,
      thumbnailUrl: p.image,
      basePrice: {
        amount: 0, // Base price comes from variants
        currency: p.currency || "USD",
      },
      availableRegions: ["US", "EU", "CA", "AU"], // Printful ships globally
      rawData: p,
    };
  }

  private normalizeCatalogVariant(v: PrintfulCatalogVariant): CatalogVariant {
    return {
      providerId: String(v.id),
      productId: String(v.product_id),
      providerSlug: this.slug,
      name: v.name,
      size: v.size,
      color: v.color,
      colorHex: v.color_code,
      price: {
        amount: parseFloat(v.price),
        currency: "USD",
      },
      inStock: v.in_stock,
      thumbnailUrl: v.image,
      rawData: v,
    };
  }

  private mapStylesToOptionGroups(styles: MockupStyle[]): string[] {
    const map: Record<MockupStyle, string> = {
      front: "Front",
      back: "Back",
      left: "Left",
      right: "Right",
      lifestyle: "Lifestyle",
      model_male: "On Male Model",
      model_female: "On Female Model",
      closeup: "Closeup",
      flat: "Flat",
      studio: "Studio",
      detail: "Closeup",
      room_context: "Lifestyle",
      packaging: "Lifestyle",
    };

    return styles.map((s) => map[s] ?? "Front");
  }

  private mapPlacementToStyle(placement: string): MockupStyle {
    const lower = placement.toLowerCase();
    if (lower.includes("front")) return "front";
    if (lower.includes("back")) return "back";
    if (lower.includes("left")) return "left";
    if (lower.includes("right")) return "right";
    if (lower.includes("lifestyle")) return "lifestyle";
    if (lower.includes("male")) return "model_male";
    if (lower.includes("female")) return "model_female";
    if (lower.includes("closeup") || lower.includes("detail")) return "closeup";
    if (lower.includes("flat")) return "flat";
    if (lower.includes("studio")) return "studio";
    return "front";
  }

  private mapPrintfulOrderStatus(
    status: string
  ): Order["status"] {
    const map: Record<string, Order["status"]> = {
      draft: "draft",
      pending: "pending",
      failed: "failed",
      canceled: "cancelled",
      inprocess: "processing",
      onhold: "pending",
      partial: "processing",
      fulfilled: "shipped",
    };
    return map[status] ?? "pending";
  }
}
