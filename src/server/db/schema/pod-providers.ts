/**
 * POD Providers Schema
 *
 * Database tables for managing multiple print-on-demand providers
 * (Printful, Gelato, Gooten, etc.)
 */

import { index, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable } from "@/server/db/schema/base";
import { productVariants } from "@/server/db/schema/product";

// ============================================================================
// POD Provider Registry
// ============================================================================

/**
 * Registered POD providers
 */
export const podProviders = createTable(
  "pod_provider",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    /** Unique identifier (printful, gelato, etc.) */
    slug: d.varchar({ length: 64 }).notNull(),
    /** Display name */
    name: d.varchar({ length: 128 }).notNull(),
    /** API base URL */
    apiBaseUrl: d.text().notNull(),
    /** Is provider currently active/enabled */
    isActive: d.boolean().notNull().default(true),
    /** Provider capabilities (mockup styles, finishes, etc.) */
    capabilities: d.jsonb().$type<{
      mockupGeneration: boolean;
      mockupStyles: string[];
      specialFinishes: string[];
      productCategories: string[];
      webhookSupport: boolean;
      apiVersion: string;
      asyncMockups: boolean;
      bulkOperations: boolean;
      apiRateLimit: number;
    }>(),
    /** Provider-specific settings */
    settings: d.jsonb().$type<Record<string, unknown>>(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("pod_provider_slug_unique").on(t.slug),
    index("pod_provider_active_idx").on(t.isActive),
  ]
);

/**
 * Provider API credentials (encrypted)
 *
 * Note: In production, use proper encryption for credential values.
 * Consider using a secrets manager like AWS Secrets Manager or Vault.
 */
export const podProviderCredentials = createTable(
  "pod_provider_credential",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    providerId: d
      .integer()
      .notNull()
      .references(() => podProviders.id, { onDelete: "cascade" }),
    credentialType: d
      .varchar({ length: 32 })
      .$type<"api_key" | "oauth" | "webhook_secret">()
      .notNull(),
    /** Encrypted credential value - use proper encryption in production */
    encryptedValue: d.text().notNull(),
    /** For OAuth tokens that expire */
    expiresAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("pod_credential_provider_idx").on(t.providerId),
    uniqueIndex("pod_credential_unique").on(t.providerId, t.credentialType),
  ]
);

// ============================================================================
// Product-Provider Links
// ============================================================================

/**
 * Links product variants to POD providers
 *
 * Allows the same product variant to be fulfilled by different providers,
 * with one marked as primary for actual fulfillment.
 */
export const productVariantPodLinks = createTable(
  "product_variant_pod_link",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    variantId: d
      .integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    providerId: d
      .integer()
      .notNull()
      .references(() => podProviders.id, { onDelete: "cascade" }),
    /** Provider's catalog product ID */
    providerProductId: d.varchar({ length: 128 }).notNull(),
    /** Provider's variant ID */
    providerVariantId: d.varchar({ length: 128 }).notNull(),
    /** Provider's SKU */
    providerSku: d.varchar({ length: 128 }),
    /** Base cost from provider (our cost) */
    baseCost: d.numeric({ precision: 10, scale: 2 }),
    /** Currency for base cost */
    baseCostCurrency: d.varchar({ length: 3 }).default("USD"),
    /** Special finish for this variant (gold_foil, embossing, etc.) */
    specialFinish: d.varchar({ length: 64 }),
    /** Use this provider for fulfillment */
    isPrimaryProvider: d.boolean().notNull().default(false),
    /** Sync status with provider */
    syncStatus: d
      .varchar({ length: 32 })
      .$type<"synced" | "pending" | "failed">()
      .notNull()
      .default("pending"),
    /** Last successful sync */
    lastSyncedAt: d.timestamp({ withTimezone: true }),
    /** Sync error message */
    syncError: d.text(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("variant_pod_link_variant_idx").on(t.variantId),
    index("variant_pod_link_provider_idx").on(t.providerId),
    index("variant_pod_link_primary_idx").on(t.isPrimaryProvider),
    uniqueIndex("variant_pod_link_unique").on(
      t.variantId,
      t.providerId,
      t.providerVariantId
    ),
  ]
);
