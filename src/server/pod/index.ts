/**
 * Multi-POD Provider System
 *
 * Unified interface for working with multiple print-on-demand providers.
 *
 * @example
 * ```typescript
 * import { getProvider, getProvidersWithFinish } from "@/server/pod";
 *
 * // Get a specific provider
 * const printful = getProvider("printful");
 * const mockups = await printful.generateMockups({ ... });
 *
 * // Find providers that support gold foil
 * const goldFoilProviders = getProvidersWithFinish("gold_foil");
 * // Returns: ["gelato"]
 * ```
 */

// Types
export * from "./types";

// Provider interface
export type { PODProvider } from "./provider-interface";
export { BasePODProvider } from "./provider-interface";

// Factory and registry
export {
  getProvider,
  getAvailableProviders,
  getAllProviderConfigs,
  providerSupports,
  getProvidersWithFinish,
  getProvidersForCategory,
  clearProviderCache,
  POD_PROVIDER_CONFIGS,
} from "./provider-factory";

// Individual providers (for direct instantiation if needed)
export { PrintfulProvider, GelatoProvider } from "./providers";
