/**
 * POD Provider Factory
 *
 * Creates and caches provider instances based on slug.
 * Handles configuration and dependency injection.
 */

import type { ProviderSlug, PODProviderConfig } from "./types";
import type { PODProvider } from "./provider-interface";
import { PrintfulProvider } from "./providers/printful";
import { GelatoProvider } from "./providers/gelato";

// ============================================================================
// Provider Registry
// ============================================================================

/**
 * Static configuration for all supported providers
 */
export const POD_PROVIDER_CONFIGS: Record<ProviderSlug, PODProviderConfig> = {
  printful: {
    slug: "printful",
    name: "Printful",
    apiBaseUrl: "https://api.printful.com",
    capabilities: {
      mockupGeneration: true,
      mockupStyles: [
        "front",
        "back",
        "left",
        "right",
        "lifestyle",
        "model_male",
        "model_female",
        "closeup",
        "flat",
        "studio",
      ],
      specialFinishes: ["embroidery", "dtg", "sublimation"],
      productCategories: ["apparel", "accessories", "home_decor", "bags"],
      webhookSupport: true,
      apiVersion: "v2",
      asyncMockups: true,
      bulkOperations: true,
      apiRateLimit: 120,
    },
  },
  gelato: {
    slug: "gelato",
    name: "Gelato",
    apiBaseUrl: "https://api.gelato.com",
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ["front", "lifestyle", "detail", "room_context", "packaging"],
      specialFinishes: [
        "gold_foil",
        "silver_foil",
        "spot_uv",
        "embossing",
        "fine_art",
      ],
      productCategories: ["prints", "posters", "canvas", "cards", "photobooks"],
      webhookSupport: true,
      apiVersion: "v4",
      asyncMockups: true,
      bulkOperations: true,
      apiRateLimit: 100,
    },
  },
  gooten: {
    slug: "gooten",
    name: "Gooten",
    apiBaseUrl: "https://api.gooten.com/v1",
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ["front", "back", "lifestyle", "flat"],
      specialFinishes: [],
      productCategories: [
        "apparel",
        "home_decor",
        "accessories",
        "phone_cases",
        "jewelry",
      ],
      webhookSupport: true,
      apiVersion: "v1",
      asyncMockups: true,
      bulkOperations: true,
      apiRateLimit: 60,
    },
  },
  spod: {
    slug: "spod",
    name: "SPOD",
    apiBaseUrl: "https://api.spod.com/v1",
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ["front", "back", "detail", "lifestyle"],
      specialFinishes: ["flex", "flock", "digital_direct"],
      productCategories: ["apparel", "accessories"],
      webhookSupport: true,
      apiVersion: "v1",
      asyncMockups: true,
      bulkOperations: false,
      apiRateLimit: 100,
    },
  },
  prodigi: {
    slug: "prodigi",
    name: "Prodigi",
    apiBaseUrl: "https://api.prodigi.com/v4.0",
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ["front", "lifestyle", "detail"],
      specialFinishes: ["giclée", "metallic", "canvas_wrap"],
      productCategories: [
        "prints",
        "canvas",
        "framed",
        "photo_products",
        "apparel",
      ],
      webhookSupport: true,
      apiVersion: "v4.0",
      asyncMockups: true,
      bulkOperations: true,
      apiRateLimit: 60,
    },
  },
  customcat: {
    slug: "customcat",
    name: "CustomCat",
    apiBaseUrl: "https://api.customcat.com/v1",
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ["front", "back", "mockup"],
      specialFinishes: ["dtg", "sublimation", "embroidery"],
      productCategories: ["apparel", "drinkware", "accessories"],
      webhookSupport: true,
      apiVersion: "v1",
      asyncMockups: true,
      bulkOperations: false,
      apiRateLimit: 60,
    },
  },
};

// ============================================================================
// Provider Factory
// ============================================================================

/** Cached provider instances */
const providerCache = new Map<ProviderSlug, PODProvider>();

/**
 * Environment variable mapping for provider API keys
 */
const ENV_KEY_MAP: Record<ProviderSlug, string> = {
  printful: "PRINTFUL_API_KEY",
  gelato: "GELATO_API_KEY",
  gooten: "GOOTEN_API_KEY",
  spod: "SPOD_API_KEY",
  prodigi: "PRODIGI_API_KEY",
  customcat: "CUSTOMCAT_API_KEY",
};

/**
 * Get a provider instance by slug
 *
 * @param slug - Provider identifier
 * @param apiKey - Optional API key override (uses env var if not provided)
 * @returns Provider instance
 * @throws Error if provider not implemented or API key missing
 */
export function getProvider(slug: ProviderSlug, apiKey?: string): PODProvider {
  // Check cache first
  const cached = providerCache.get(slug);
  if (cached) {
    return cached;
  }

  // Get config
  const config = POD_PROVIDER_CONFIGS[slug];
  if (!config) {
    throw new Error(`Unknown provider: ${slug}`);
  }

  // Get API key from env if not provided
  const key = apiKey ?? process.env[ENV_KEY_MAP[slug]];
  if (!key) {
    throw new Error(
      `Missing API key for ${config.name}. Set ${ENV_KEY_MAP[slug]} environment variable.`
    );
  }

  // Create provider instance
  let provider: PODProvider;

  switch (slug) {
    case "printful":
      provider = new PrintfulProvider(key);
      break;
    case "gelato":
      provider = new GelatoProvider(key);
      break;
    case "gooten":
    case "spod":
    case "prodigi":
    case "customcat":
      throw new Error(
        `Provider ${config.name} is not yet implemented. See docs/mockup-management-plan.md for roadmap.`
      );
    default:
      throw new Error(`Unknown provider: ${slug}`);
  }

  // Cache and return
  providerCache.set(slug, provider);
  return provider;
}

/**
 * Get all available (implemented) providers
 */
export function getAvailableProviders(): ProviderSlug[] {
  return ["printful", "gelato"];
}

/**
 * Get all configured providers (implemented + future)
 */
export function getAllProviderConfigs(): PODProviderConfig[] {
  return Object.values(POD_PROVIDER_CONFIGS);
}

/**
 * Check if a provider supports a specific capability
 */
export function providerSupports(
  slug: ProviderSlug,
  capability: keyof PODProviderConfig["capabilities"]
): boolean {
  const config = POD_PROVIDER_CONFIGS[slug];
  if (!config) return false;

  const value = config.capabilities[capability];
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

/**
 * Find providers that support a specific special finish
 */
export function getProvidersWithFinish(finish: string): ProviderSlug[] {
  return Object.entries(POD_PROVIDER_CONFIGS)
    .filter(([_, config]) =>
      config.capabilities.specialFinishes.includes(finish)
    )
    .map(([slug]) => slug as ProviderSlug);
}

/**
 * Find providers for a product category
 */
export function getProvidersForCategory(category: string): ProviderSlug[] {
  return Object.entries(POD_PROVIDER_CONFIGS)
    .filter(([_, config]) =>
      config.capabilities.productCategories.includes(category)
    )
    .map(([slug]) => slug as ProviderSlug);
}

/**
 * Clear the provider cache (useful for testing)
 */
export function clearProviderCache(): void {
  providerCache.clear();
}
