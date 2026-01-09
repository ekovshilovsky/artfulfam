/**
 * API Schemas - Zod definitions for all API contracts
 */

import { z } from 'zod';

// ============================================================================
// Common schemas
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    hasMore: z.boolean(),
  });

// ============================================================================
// Template schemas (POD catalog)
// ============================================================================

export const TemplateVariantSchema = z.object({
  id: z.string(),
  providerVariantId: z.string(),
  name: z.string(),
  color: z.string().optional(),
  size: z.string().optional(),
  baseCost: z.number(), // cents
  retailPrice: z.number().optional(), // cents, suggested retail
  inStock: z.boolean().default(true),
});

export const TemplateSchema = z.object({
  id: z.string(),
  providerKey: z.enum(['printful', 'printify', 'gooten']),
  providerTemplateId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  variants: z.array(TemplateVariantSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Template = z.infer<typeof TemplateSchema>;
export type TemplateVariant = z.infer<typeof TemplateVariantSchema>;

// ============================================================================
// Draft schemas (product drafts)
// ============================================================================

export const DraftStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
]);

export const DraftVariantSchema = z.object({
  templateVariantId: z.string(),
  enabled: z.boolean().default(true),
  priceOverride: z.number().optional(), // cents
});

export const DraftSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  templateId: z.string(),
  title: z.string().min(1).max(140),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  variants: z.array(DraftVariantSchema),
  status: DraftStatusSchema,
  shopifyProductId: z.string().optional(),
  previewToken: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Draft = z.infer<typeof DraftSchema>;
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

// ============================================================================
// API request/response schemas
// ============================================================================

export const CreateDraftRequestSchema = z.object({
  templateId: z.string(),
  title: z.string().min(1).max(140),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  variants: z.array(DraftVariantSchema).optional(),
});

export const UpdateDraftRequestSchema = CreateDraftRequestSchema.partial();

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
});

export type CreateDraftRequest = z.infer<typeof CreateDraftRequestSchema>;
export type UpdateDraftRequest = z.infer<typeof UpdateDraftRequestSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
