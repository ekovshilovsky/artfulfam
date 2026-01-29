/**
 * Mockups Schema
 *
 * Database tables for:
 * - Product mockups from POD providers
 * - Workflow states and transitions
 * - AI analysis results
 * - Generation jobs
 * - Audit logging
 */

import { relations } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable } from "@/server/db/schema/base";
import { products, productVariants } from "@/server/db/schema/product";
import { podProviders } from "@/server/db/schema/pod-providers";
import { users } from "@/server/db/schema/users";

// ============================================================================
// Workflow Status Type
// ============================================================================

export type MockupWorkflowStatus =
  | "pending_generation"
  | "generation_failed"
  | "pending_ai_review"
  | "ai_approved"
  | "ai_rejected"
  | "ai_needs_review"
  | "pending_human_review"
  | "human_approved"
  | "human_rejected"
  | "published"
  | "archived";

// ============================================================================
// Product Mockups
// ============================================================================

/**
 * Product mockups from any POD provider
 */
export const productMockups = createTable(
  "product_mockup",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    productId: d
      .integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: d
      .integer()
      .references(() => productVariants.id, { onDelete: "cascade" }),

    // Provider references
    providerId: d
      .integer()
      .notNull()
      .references(() => podProviders.id, { onDelete: "restrict" }),
    /** Provider's catalog product ID */
    providerProductId: d.varchar({ length: 128 }).notNull(),
    /** Provider's variant ID (if variant-specific) */
    providerVariantId: d.varchar({ length: 128 }),
    /** Provider's mockup generation task/job ID */
    providerTaskId: d.varchar({ length: 128 }),

    // Mockup metadata
    /** Style: front, back, lifestyle, model_male, etc. */
    mockupStyle: d.varchar({ length: 64 }).notNull(),
    /** Placement on product: front, back, sleeve, etc. */
    placement: d.varchar({ length: 64 }).notNull(),
    /** Special finish applied: gold_foil, embossing, etc. */
    specialFinish: d.varchar({ length: 64 }),
    /** Original URL from provider */
    originalUrl: d.text().notNull(),
    /** Our S3 copy */
    storedUrl: d.text(),
    /** Thumbnail URL */
    thumbnailUrl: d.text(),
    /** Computed image URL (storedUrl if available, else originalUrl) */
    imageUrl: d.text(),
    /** Provider slug (e.g., "printful", "gelato") */
    providerSlug: d.varchar({ length: 32 }),

    // Workflow state
    workflowStatus: d
      .varchar({ length: 32 })
      .$type<MockupWorkflowStatus>()
      .notNull()
      .default("pending_generation"),
    workflowChangedAt: d.timestamp({ withTimezone: true }),
    workflowChangedBy: d.uuid().references(() => users.id, {
      onDelete: "set null",
    }),

    // Selection state
    /** Final decision: include in gallery */
    isGallerySelected: d.boolean().notNull().default(false),
    /** Display order in gallery */
    displayOrder: d.integer().notNull().default(0),
    /** Is this the primary/hero image for the product */
    isPrimary: d.boolean().notNull().default(false),

    // Review tracking
    reviewedBy: d.uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: d.timestamp({ withTimezone: true }),
    /** Reason for manual override */
    reviewNotes: d.text(),

    // Publication tracking
    publishedAt: d.timestamp({ withTimezone: true }),

    // Generation metadata
    /** Original artwork URL */
    artworkUrl: d.text(),
    generationStatus: d
      .varchar({ length: 32 })
      .$type<"pending" | "processing" | "completed" | "failed">()
      .notNull()
      .default("pending"),
    generationError: d.text(),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("mockup_product_idx").on(t.productId),
    index("mockup_variant_idx").on(t.variantId),
    index("mockup_provider_idx").on(t.providerId),
    index("mockup_workflow_idx").on(t.workflowStatus),
    index("mockup_selected_idx").on(t.isGallerySelected),
    index("mockup_primary_idx").on(t.isPrimary),
    index("mockup_style_idx").on(t.mockupStyle),
  ]
);

// ============================================================================
// AI Analysis
// ============================================================================

/**
 * Claude AI analysis results for mockups
 */
export const mockupAnalyses = createTable(
  "mockup_analysis",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    mockupId: d
      .uuid()
      .notNull()
      .references(() => productMockups.id, { onDelete: "cascade" }),

    // Scores (0-100)
    /** Overall quality score */
    overallScore: d.integer().notNull(),
    /** Is artwork clearly visible? */
    visibilityScore: d.integer().notNull(),
    /** Color clash detection */
    colorHarmonyScore: d.integer().notNull(),
    /** Design vs product contrast */
    contrastScore: d.integer().notNull(),
    /** Composition/positioning score */
    compositionScore: d.integer().notNull(),

    // AI decision
    recommendation: d
      .varchar({ length: 32 })
      .$type<"approve" | "reject" | "needs_review">()
      .notNull(),
    /** How confident is AI? (0-100) */
    confidence: d.integer().notNull(),
    /** Detailed AI explanation */
    explanation: d.text().notNull(),
    /** Array of specific issues found */
    issues: d.jsonb().$type<
      Array<{
        type: string;
        severity: string;
        description: string;
        suggestion?: string;
      }>
    >(),
    /** Array of positive aspects */
    strengths: d.jsonb().$type<string[]>(),

    // Model metadata
    /** Model used (e.g., claude-sonnet-4-20250514) */
    modelVersion: d.varchar({ length: 64 }),
    /** Prompt version for tracking changes */
    promptVersion: d.varchar({ length: 32 }),
    /** Tokens used (for cost tracking) */
    tokensUsed: d.integer(),
    /** Response latency in ms */
    latencyMs: d.integer(),

    // Human feedback on AI decision
    humanAgreed: d.boolean(),
    humanFeedback: d.text(),
    humanFeedbackBy: d.uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    humanFeedbackAt: d.timestamp({ withTimezone: true }),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("analysis_mockup_idx").on(t.mockupId),
    index("analysis_quality_idx").on(t.overallScore),
    index("analysis_recommendation_idx").on(t.recommendation),
    index("analysis_confidence_idx").on(t.confidence),
  ]
);

// ============================================================================
// Workflow Audit Log
// ============================================================================

/**
 * Audit log for all workflow state changes
 */
export const mockupWorkflowLog = createTable(
  "mockup_workflow_log",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    mockupId: d
      .uuid()
      .notNull()
      .references(() => productMockups.id, { onDelete: "cascade" }),
    fromStatus: d.varchar({ length: 32 }).$type<MockupWorkflowStatus>(),
    toStatus: d.varchar({ length: 32 }).$type<MockupWorkflowStatus>().notNull(),
    /** The action that caused the transition */
    action: d.varchar({ length: 64 }).notNull(),
    /** Who made the change (null for system actions) */
    performedBy: d.varchar({ length: 128 }),
    /** Role of the performer */
    performedByRole: d.varchar({ length: 32 }),
    /** Reason for change */
    reason: d.text(),
    /** Extra context (JSON) */
    metadata: d.jsonb().$type<Record<string, unknown>>(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("workflow_log_mockup_idx").on(t.mockupId),
    index("workflow_log_status_idx").on(t.toStatus),
    index("workflow_log_action_idx").on(t.action),
    index("workflow_log_created_idx").on(t.createdAt),
  ]
);

// ============================================================================
// Mockup Generation Jobs
// ============================================================================

/**
 * Track async mockup generation jobs across providers
 */
export const mockupGenerationJobs = createTable(
  "mockup_generation_job",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    productId: d.varchar({ length: 128 }).notNull(),

    // Provider info
    providerSlug: d.varchar({ length: 32 }).notNull(),
    /** Provider's job/task ID */
    providerTaskId: d.varchar({ length: 128 }),

    // Job configuration
    artworkUrl: d.text().notNull(),
    /** Placement on product */
    placement: d.varchar({ length: 64 }).notNull(),
    /** Array of requested mockup styles */
    styles: d.jsonb().$type<string[]>().notNull(),
    /** Specific variant IDs (null = all variants) */
    variantIds: d.jsonb().$type<string[]>(),
    /** Special finish to apply */
    specialFinish: d.varchar({ length: 64 }),

    // Status tracking
    status: d
      .varchar({ length: 32 })
      .$type<"pending" | "submitted" | "processing" | "completed" | "failed">()
      .notNull()
      .default("pending"),
    errorMessage: d.text(),
    retryCount: d.integer().notNull().default(0),

    // Progress
    totalMockups: d.integer().notNull().default(0),
    completedMockups: d.integer().notNull().default(0),
    failedMockups: d.integer().notNull().default(0),

    // Timestamps
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    startedAt: d.timestamp({ withTimezone: true }),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("gen_job_product_idx").on(t.productId),
    index("gen_job_provider_idx").on(t.providerSlug),
    index("gen_job_status_idx").on(t.status),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const productMockupsRelations = relations(productMockups, ({ one, many }) => ({
  product: one(products, {
    fields: [productMockups.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productMockups.variantId],
    references: [productVariants.id],
  }),
  provider: one(podProviders, {
    fields: [productMockups.providerId],
    references: [podProviders.id],
  }),
  analyses: many(mockupAnalyses),
  workflowLogs: many(mockupWorkflowLog),
}));

export const mockupAnalysesRelations = relations(mockupAnalyses, ({ one }) => ({
  mockup: one(productMockups, {
    fields: [mockupAnalyses.mockupId],
    references: [productMockups.id],
  }),
}));

export const mockupWorkflowLogRelations = relations(mockupWorkflowLog, ({ one }) => ({
  mockup: one(productMockups, {
    fields: [mockupWorkflowLog.mockupId],
    references: [productMockups.id],
  }),
}));
