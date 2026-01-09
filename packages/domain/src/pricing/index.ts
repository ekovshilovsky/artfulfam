/**
 * Pricing and profit calculation logic
 */

export interface PricingConfig {
  minProfitAbsolute: number; // cents - minimum absolute profit per item
  minProfitPercent: number; // decimal (0.15 = 15%) - minimum profit margin
}

export interface VariantPricing {
  baseCost: number; // cents - what we pay the POD provider
  retailPrice: number; // cents - what we charge the customer
  profit: number; // cents - retailPrice - baseCost
  profitPercent: number; // decimal
}

/**
 * Calculate the minimum retail price for a variant
 */
export function calculateMinRetailPrice(
  baseCost: number,
  config: PricingConfig
): number {
  const minByAbsolute = baseCost + config.minProfitAbsolute;
  const minByPercent = Math.ceil(baseCost / (1 - config.minProfitPercent));
  return Math.max(minByAbsolute, minByPercent);
}

/**
 * Calculate pricing details for a variant
 */
export function calculateVariantPricing(
  baseCost: number,
  retailPrice: number
): VariantPricing {
  const profit = retailPrice - baseCost;
  const profitPercent = retailPrice > 0 ? profit / retailPrice : 0;

  return {
    baseCost,
    retailPrice,
    profit,
    profitPercent,
  };
}

/**
 * Validate that a retail price meets minimum profit requirements
 */
export function validatePricing(
  baseCost: number,
  retailPrice: number,
  config: PricingConfig
): { valid: boolean; reason?: string } {
  const pricing = calculateVariantPricing(baseCost, retailPrice);

  if (pricing.profit < config.minProfitAbsolute) {
    return {
      valid: false,
      reason: `Profit (${pricing.profit}¢) is below minimum (${config.minProfitAbsolute}¢)`,
    };
  }

  if (pricing.profitPercent < config.minProfitPercent) {
    return {
      valid: false,
      reason: `Profit margin (${(pricing.profitPercent * 100).toFixed(1)}%) is below minimum (${(config.minProfitPercent * 100).toFixed(1)}%)`,
    };
  }

  return { valid: true };
}
