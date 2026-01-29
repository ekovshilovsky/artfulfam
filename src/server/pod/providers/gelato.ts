/**
 * Gelato POD Provider Implementation
 *
 * Implements the PODProvider interface for Gelato API v4
 * https://docs.gelato.com/
 *
 * Gelato specializes in premium prints with special finishes:
 * - Gold foil
 * - Silver foil
 * - Spot UV
 * - Embossing
 * - Fine art prints
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
  SpecialFinish,
} from "../types";
import { POD_PROVIDER_CONFIGS } from "../provider-factory";
import crypto from "crypto";

// ============================================================================
// Gelato API Types
// ============================================================================

interface GelatoProduct {
  productUid: string;
  title: string;
  description: string;
  categoryUid: string;
  categoryName: string;
  previewUrl: string;
  productAttributes: Array<{
    attributeUid: string;
    attributeName: string;
    values: Array<{
      valueUid: string;
      valueName: string;
    }>;
  }>;
  supportedCountries: string[];
  finishingOptions?: string[];
}

interface GelatoVariant {
  productUid: string;
  variantUid: string;
  title: string;
  attributes: Array<{
    attributeUid: string;
    attributeName: string;
    valueUid: string;
    valueName: string;
  }>;
  price: {
    amount: number;
    currency: string;
  };
  inStock: boolean;
  previewUrl?: string;
}

interface GelatoMockupJob {
  mockupJobUid: string;
  status: "pending" | "processing" | "completed" | "failed";
  mockups?: Array<{
    mockupUid: string;
    variantUid: string;
    placement: string;
    mockupType: string;
    imageUrl: string;
    finishingOption?: string;
  }>;
  errorMessage?: string;
  progress?: number;
}

interface GelatoOrder {
  orderUid: string;
  externalId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  shipments?: Array<{
    shipmentUid: string;
    carrier: string;
    trackingCode: string;
    trackingUrl: string;
    estimatedDeliveryDate?: string;
  }>;
}

// ============================================================================
// Gelato Provider Implementation
// ============================================================================

export class GelatoProvider extends BasePODProvider {
  readonly slug: ProviderSlug = "gelato";
  readonly name = "Gelato";
  readonly capabilities: PODProviderCapabilities;

  constructor(apiKey: string) {
    super(apiKey, "https://api.gelato.com/v4");
    this.capabilities = POD_PROVIDER_CONFIGS.gelato.capabilities;
  }

  // ==========================================================================
  // Request Helper (Gelato-specific handling)
  // ==========================================================================

  protected override async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gelato API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // ==========================================================================
  // Catalog Methods
  // ==========================================================================

  async listProducts(options?: ListProductsOptions): Promise<CatalogProduct[]> {
    const params = new URLSearchParams();
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.category) params.set("categoryUid", options.category);
    if (options?.search) params.set("search", options.search);

    const queryString = params.toString();
    const path = `/products${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<{ products: GelatoProduct[] }>(path);

    return response.products.map((p) => this.normalizeCatalogProduct(p));
  }

  async getProduct(productId: string): Promise<CatalogProduct> {
    const product = await this.request<GelatoProduct>(`/products/${productId}`);
    return this.normalizeCatalogProduct(product);
  }

  async getProductVariants(
    productId: string,
    options?: ListVariantsOptions
  ): Promise<CatalogVariant[]> {
    const response = await this.request<{ variants: GelatoVariant[] }>(
      `/products/${productId}/variants`
    );

    let variants = response.variants.map((v) => this.normalizeCatalogVariant(v));

    // Apply filters
    if (options?.inStockOnly) {
      variants = variants.filter((v) => v.inStock);
    }

    return variants;
  }

  async getMockupStyles(productId: string): Promise<MockupStyle[]> {
    // Gelato provides mockup options per product
    const response = await this.request<{
      mockupOptions: Array<{
        type: string;
        name: string;
      }>;
    }>(`/products/${productId}/mockup-options`);

    const styleMap: Record<string, MockupStyle> = {
      front: "front",
      lifestyle: "lifestyle",
      detail: "detail",
      "room-context": "room_context",
      packaging: "packaging",
    };

    const styles: MockupStyle[] = [];
    for (const opt of response.mockupOptions || []) {
      const mapped = styleMap[opt.type.toLowerCase()];
      if (mapped && !styles.includes(mapped)) {
        styles.push(mapped);
      }
    }

    return styles.length > 0 ? styles : ["front"];
  }

  // ==========================================================================
  // Mockup Methods
  // ==========================================================================

  async generateMockups(request: MockupRequest): Promise<MockupJob> {
    const body = {
      productUid: request.productId,
      variantUids: request.variantIds,
      fileUrl: request.artworkUrl,
      placement: request.placement,
      mockupTypes: this.mapStylesToMockupTypes(request.styles),
      finishingOption: request.specialFinish
        ? this.mapFinishToGelatoOption(request.specialFinish)
        : undefined,
      outputFormat: request.format ?? "png",
      width: request.width ?? 1000,
    };

    const result = await this.request<{ mockupJobUid: string }>(
      "/mockup-generator/jobs",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return {
      jobId: result.mockupJobUid,
      providerTaskId: result.mockupJobUid,
      providerSlug: this.slug,
      status: "submitted",
      createdAt: new Date(),
    };
  }

  async getMockupJobStatus(taskId: string): Promise<MockupJobResult> {
    const job = await this.request<GelatoMockupJob>(
      `/mockup-generator/jobs/${taskId}`
    );

    const mockups: GeneratedMockup[] = [];

    if (job.mockups) {
      // Group mockups by placement/style
      for (const m of job.mockups) {
        mockups.push({
          style: this.mapMockupTypeToStyle(m.mockupType),
          placement: m.placement,
          variantIds: [m.variantUid],
          imageUrl: m.imageUrl,
          specialFinish: m.finishingOption
            ? this.mapGelatoOptionToFinish(m.finishingOption)
            : undefined,
        });
      }
    }

    return {
      providerTaskId: taskId,
      status: job.status,
      mockups: mockups.length > 0 ? mockups : undefined,
      error: job.errorMessage,
      progress: job.progress,
    };
  }

  // ==========================================================================
  // Order Methods
  // ==========================================================================

  async createOrder(order: OrderRequest): Promise<Order> {
    const body = {
      externalId: order.externalId,
      shippingAddress: {
        firstName: order.shippingAddress.name.split(" ")[0],
        lastName: order.shippingAddress.name.split(" ").slice(1).join(" "),
        companyName: order.shippingAddress.company,
        addressLine1: order.shippingAddress.address1,
        addressLine2: order.shippingAddress.address2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.stateCode,
        country: order.shippingAddress.countryCode,
        postCode: order.shippingAddress.postalCode,
        phone: order.shippingAddress.phone,
        email: order.shippingAddress.email,
      },
      items: order.items.map((item) => ({
        variantUid: item.variantId,
        quantity: item.quantity,
        files: item.files.map((f) => ({
          type: f.type,
          url: f.url,
        })),
        finishingOption: item.specialFinish
          ? this.mapFinishToGelatoOption(item.specialFinish)
          : undefined,
      })),
    };

    const result = await this.request<GelatoOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      providerId: result.orderUid,
      externalId: result.externalId,
      providerSlug: this.slug,
      status: this.mapGelatoOrderStatus(result.status),
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt),
    };
  }

  async getOrderStatus(orderId: string): Promise<Order> {
    const result = await this.request<GelatoOrder>(`/orders/${orderId}`);

    const latestShipment = result.shipments?.[0];

    return {
      providerId: result.orderUid,
      externalId: result.externalId,
      providerSlug: this.slug,
      status: this.mapGelatoOrderStatus(result.status),
      shipping: latestShipment
        ? {
            carrier: latestShipment.carrier,
            trackingNumber: latestShipment.trackingCode,
            trackingUrl: latestShipment.trackingUrl,
            estimatedDelivery: latestShipment.estimatedDeliveryDate
              ? new Date(latestShipment.estimatedDeliveryDate)
              : undefined,
          }
        : undefined,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt),
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.request(`/orders/${orderId}/cancel`, {
        method: "POST",
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
    const webhookSecret = process.env.GELATO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("GELATO_WEBHOOK_SECRET not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const data = payload as {
      eventType: string;
      timestamp: string;
      data: {
        orderUid?: string;
        externalId?: string;
        status?: string;
        mockupJobUid?: string;
        shipment?: {
          carrier: string;
          trackingCode: string;
          trackingUrl: string;
        };
      };
    };

    const typeMap: Record<string, WebhookEvent["type"]> = {
      "order.created": "order.created",
      "order.status_changed": "order.updated",
      "order.shipped": "order.shipped",
      "order.delivered": "order.delivered",
      "order.cancelled": "order.cancelled",
      "order.failed": "order.failed",
      "mockup.completed": "mockup.completed",
      "mockup.failed": "mockup.failed",
    };

    return {
      type: typeMap[data.eventType] ?? "order.updated",
      providerSlug: this.slug,
      timestamp: new Date(data.timestamp),
      data: data.data,
      rawPayload: payload,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private normalizeCatalogProduct(p: GelatoProduct): CatalogProduct {
    return {
      providerId: p.productUid,
      providerSlug: this.slug,
      name: p.title,
      description: p.description || "",
      category: p.categoryName,
      thumbnailUrl: p.previewUrl,
      basePrice: {
        amount: 0, // Base price comes from variants
        currency: "USD",
      },
      specialFinishes: p.finishingOptions?.map((f) =>
        this.mapGelatoOptionToFinish(f)
      ).filter((f): f is SpecialFinish => f !== undefined),
      availableRegions: p.supportedCountries,
      rawData: p,
    };
  }

  private normalizeCatalogVariant(v: GelatoVariant): CatalogVariant {
    // Extract size and color from attributes
    const sizeAttr = v.attributes.find(
      (a) => a.attributeName.toLowerCase() === "size"
    );
    const colorAttr = v.attributes.find(
      (a) => a.attributeName.toLowerCase() === "color"
    );

    return {
      providerId: v.variantUid,
      productId: v.productUid,
      providerSlug: this.slug,
      name: v.title,
      size: sizeAttr?.valueName,
      color: colorAttr?.valueName,
      price: {
        amount: v.price.amount,
        currency: v.price.currency,
      },
      inStock: v.inStock,
      thumbnailUrl: v.previewUrl,
      rawData: v,
    };
  }

  private mapStylesToMockupTypes(styles: MockupStyle[]): string[] {
    const map: Record<MockupStyle, string> = {
      front: "front",
      back: "back",
      left: "side",
      right: "side",
      lifestyle: "lifestyle",
      model_male: "lifestyle",
      model_female: "lifestyle",
      closeup: "detail",
      flat: "front",
      studio: "front",
      detail: "detail",
      room_context: "room-context",
      packaging: "packaging",
    };

    return [...new Set(styles.map((s) => map[s] ?? "front"))];
  }

  private mapMockupTypeToStyle(type: string): MockupStyle {
    const map: Record<string, MockupStyle> = {
      front: "front",
      back: "back",
      side: "left",
      lifestyle: "lifestyle",
      detail: "detail",
      "room-context": "room_context",
      packaging: "packaging",
    };
    return map[type.toLowerCase()] ?? "front";
  }

  private mapFinishToGelatoOption(finish: SpecialFinish): string {
    const map: Record<SpecialFinish, string> = {
      gold_foil: "gold-foil",
      silver_foil: "silver-foil",
      spot_uv: "spot-uv",
      embossing: "embossing",
      fine_art: "fine-art",
      // Printful-specific (not supported by Gelato)
      embroidery: "",
      dtg: "",
      sublimation: "",
      flex: "",
      flock: "",
      digital_direct: "",
      giclée: "fine-art",
      metallic: "metallic",
      canvas_wrap: "canvas-wrap",
    };
    return map[finish] || "";
  }

  private mapGelatoOptionToFinish(option: string): SpecialFinish | undefined {
    const map: Record<string, SpecialFinish> = {
      "gold-foil": "gold_foil",
      "silver-foil": "silver_foil",
      "spot-uv": "spot_uv",
      embossing: "embossing",
      "fine-art": "fine_art",
      metallic: "metallic",
      "canvas-wrap": "canvas_wrap",
    };
    return map[option.toLowerCase()];
  }

  private mapGelatoOrderStatus(status: string): Order["status"] {
    const map: Record<string, Order["status"]> = {
      draft: "draft",
      created: "pending",
      pending: "pending",
      "in-production": "processing",
      produced: "processing",
      shipped: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      failed: "failed",
    };
    return map[status.toLowerCase()] ?? "pending";
  }
}
