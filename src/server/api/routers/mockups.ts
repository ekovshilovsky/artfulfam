/**
 * Mockup Management Router
 *
 * Admin endpoints for managing product mockups, AI analysis,
 * and workflow state transitions.
 */

import { z } from "zod";
import { desc, eq, and, or, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  productMockups,
  mockupAnalyses,
  mockupWorkflowLog,
  mockupGenerationJobs,
  type MockupWorkflowStatus,
} from "@/server/db/schema/mockups";
import { MockupWorkflowManager } from "@/server/workflow/mockup-workflow";
import { analyzeMockup, type AnalyzerOptions } from "@/server/ai/mockup-analyzer";
import { getProvider, getAvailableProviders, POD_PROVIDER_CONFIGS } from "@/server/pod";

// ============================================================================
// Input Schemas
// ============================================================================

const workflowStatusSchema = z.enum([
  "pending_generation",
  "generation_failed",
  "pending_ai_review",
  "ai_approved",
  "ai_rejected",
  "ai_needs_review",
  "pending_human_review",
  "human_approved",
  "human_rejected",
  "published",
  "archived",
]);

const workflowActionSchema = z.enum([
  "submit_for_generation",
  "generation_complete",
  "generation_failed",
  "submit_for_ai_review",
  "ai_approve",
  "ai_reject",
  "ai_flag_for_review",
  "submit_for_human_review",
  "human_approve",
  "human_reject",
  "human_request_changes",
  "publish",
  "unpublish",
  "archive",
  "restore",
]);

// ============================================================================
// Router
// ============================================================================

export const mockupsRouter = createTRPCRouter({
  // ==========================================================================
  // List & Query
  // ==========================================================================

  /**
   * List mockups with filtering and pagination
   */
  list: adminProcedure
    .input(
      z.object({
        status: workflowStatusSchema.optional(),
        productId: z.number().int().optional(),
        variantId: z.number().int().optional(),
        providerSlug: z.string().optional(),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status) {
        conditions.push(eq(productMockups.workflowStatus, input.status));
      }
      if (input.productId) {
        conditions.push(eq(productMockups.productId, input.productId));
      }
      if (input.variantId) {
        conditions.push(eq(productMockups.variantId, input.variantId));
      }
      if (input.providerSlug) {
        conditions.push(eq(productMockups.providerSlug, input.providerSlug));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const mockups = await ctx.db.query.productMockups.findMany({
        where,
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(productMockups.createdAt)],
        with: {
          analyses: {
            orderBy: [desc(mockupAnalyses.createdAt)],
            limit: 1,
          },
        },
      });

      // Get total count
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(productMockups)
        .where(where);

      return {
        mockups,
        total: countResult?.count ?? 0,
        hasMore: input.offset + mockups.length < (countResult?.count ?? 0),
      };
    }),

  /**
   * Get mockups pending review (for admin dashboard)
   */
  pendingReview: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.productMockups.findMany({
        where: or(
          eq(productMockups.workflowStatus, "pending_human_review"),
          eq(productMockups.workflowStatus, "ai_needs_review")
        ),
        limit: input.limit,
        orderBy: [desc(productMockups.createdAt)],
        with: {
          analyses: {
            orderBy: [desc(mockupAnalyses.createdAt)],
            limit: 1,
          },
        },
      });
    }),

  /**
   * Get a single mockup with full details
   */
  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const mockup = await ctx.db.query.productMockups.findFirst({
        where: eq(productMockups.id, input.id),
        with: {
          analyses: {
            orderBy: [desc(mockupAnalyses.createdAt)],
          },
          workflowLogs: {
            orderBy: [desc(mockupWorkflowLog.createdAt)],
            limit: 20,
          },
        },
      });

      if (!mockup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mockup not found" });
      }

      return mockup;
    }),

  /**
   * Get workflow counts by status (for dashboard)
   */
  statusCounts: adminProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select({
        status: productMockups.workflowStatus,
        count: sql<number>`count(*)`,
      })
      .from(productMockups)
      .groupBy(productMockups.workflowStatus);

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.status] = row.count;
    }

    return counts;
  }),

  // ==========================================================================
  // AI Analysis
  // ==========================================================================

  /**
   * Run AI analysis on a mockup
   */
  runAiAnalysis: adminProcedure
    .input(
      z.object({
        mockupId: z.string().uuid(),
        options: z
          .object({
            approvalThreshold: z.number().int().min(0).max(100).optional(),
            reviewThreshold: z.number().int().min(0).max(100).optional(),
            productType: z.string().optional(),
            specialFinish: z.string().optional(),
            variantColor: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mockup = await ctx.db.query.productMockups.findFirst({
        where: eq(productMockups.id, input.mockupId),
      });

      if (!mockup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mockup not found" });
      }

      if (!mockup.imageUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Mockup has no image URL",
        });
      }

      // Run AI analysis
      const analysis = await analyzeMockup(
        mockup.imageUrl,
        input.options as AnalyzerOptions
      );

      // Store analysis
      const [savedAnalysis] = await ctx.db
        .insert(mockupAnalyses)
        .values({
          mockupId: input.mockupId,
          overallScore: analysis.overallScore,
          visibilityScore: analysis.visibilityScore,
          colorHarmonyScore: analysis.colorHarmonyScore,
          contrastScore: analysis.contrastScore,
          compositionScore: analysis.compositionScore,
          recommendation: analysis.recommendation,
          issues: analysis.issues,
          strengths: analysis.strengths,
          explanation: analysis.explanation,
          confidence: analysis.confidence,
          modelVersion: "claude-sonnet-4-20250514",
          createdAt: new Date(),
        })
        .returning();

      // Update workflow status based on recommendation
      const workflowManager = new MockupWorkflowManager(ctx.db);
      let action: "ai_approve" | "ai_reject" | "ai_flag_for_review";

      switch (analysis.recommendation) {
        case "approve":
          action = "ai_approve";
          break;
        case "reject":
          action = "ai_reject";
          break;
        default:
          action = "ai_flag_for_review";
      }

      const transition = await workflowManager.transition(input.mockupId, action, {
        userId: "system",
        userRole: "ai",
        reason: analysis.explanation,
        metadata: {
          overallScore: analysis.overallScore,
          recommendation: analysis.recommendation,
        },
      });

      return {
        analysis: savedAnalysis,
        transition,
      };
    }),

  /**
   * Batch AI analysis for multiple mockups
   */
  runBatchAiAnalysis: adminProcedure
    .input(
      z.object({
        mockupIds: z.array(z.string().uuid()).min(1).max(20),
        options: z
          .object({
            approvalThreshold: z.number().int().min(0).max(100).optional(),
            reviewThreshold: z.number().int().min(0).max(100).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results: Array<{
        mockupId: string;
        success: boolean;
        recommendation?: string;
        error?: string;
      }> = [];

      for (const mockupId of input.mockupIds) {
        try {
          const mockup = await ctx.db.query.productMockups.findFirst({
            where: eq(productMockups.id, mockupId),
          });

          if (!mockup?.imageUrl) {
            results.push({
              mockupId,
              success: false,
              error: "Mockup not found or has no image",
            });
            continue;
          }

          const analysis = await analyzeMockup(
            mockup.imageUrl,
            input.options as AnalyzerOptions
          );

          await ctx.db.insert(mockupAnalyses).values({
            mockupId,
            overallScore: analysis.overallScore,
            visibilityScore: analysis.visibilityScore,
            colorHarmonyScore: analysis.colorHarmonyScore,
            contrastScore: analysis.contrastScore,
            compositionScore: analysis.compositionScore,
            recommendation: analysis.recommendation,
            issues: analysis.issues,
            strengths: analysis.strengths,
            explanation: analysis.explanation,
            confidence: analysis.confidence,
            modelVersion: "claude-sonnet-4-20250514",
            createdAt: new Date(),
          });

          const workflowManager = new MockupWorkflowManager(ctx.db);
          const action =
            analysis.recommendation === "approve"
              ? "ai_approve"
              : analysis.recommendation === "reject"
                ? "ai_reject"
                : "ai_flag_for_review";

          await workflowManager.transition(mockupId, action, {
            userId: "system",
            userRole: "ai",
            reason: analysis.explanation,
          });

          results.push({
            mockupId,
            success: true,
            recommendation: analysis.recommendation,
          });
        } catch (error) {
          results.push({
            mockupId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        results,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
      };
    }),

  // ==========================================================================
  // Workflow Actions
  // ==========================================================================

  /**
   * Perform a workflow transition
   */
  transition: adminProcedure
    .input(
      z.object({
        mockupId: z.string().uuid(),
        action: workflowActionSchema,
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workflowManager = new MockupWorkflowManager(ctx.db);

      // TODO: Get actual user info from auth context
      const result = await workflowManager.transition(input.mockupId, input.action, {
        userId: "admin", // Replace with actual user ID
        userRole: "admin",
        reason: input.reason,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error ?? "Transition failed",
        });
      }

      return result;
    }),

  /**
   * Bulk workflow transition
   */
  bulkTransition: adminProcedure
    .input(
      z.object({
        mockupIds: z.array(z.string().uuid()).min(1).max(50),
        action: workflowActionSchema,
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workflowManager = new MockupWorkflowManager(ctx.db);

      const results = await workflowManager.bulkTransition(
        input.mockupIds,
        input.action,
        {
          userId: "admin",
          userRole: "admin",
          reason: input.reason,
        }
      );

      const successIds: string[] = [];
      const failedIds: string[] = [];

      for (const [id, result] of results) {
        if (result.success) {
          successIds.push(id);
        } else {
          failedIds.push(id);
        }
      }

      return {
        successCount: successIds.length,
        failedCount: failedIds.length,
        successIds,
        failedIds,
      };
    }),

  /**
   * Get workflow history for a mockup
   */
  getWorkflowHistory: adminProcedure
    .input(z.object({ mockupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.mockupWorkflowLog.findMany({
        where: eq(mockupWorkflowLog.mockupId, input.mockupId),
        orderBy: [desc(mockupWorkflowLog.createdAt)],
      });
    }),

  // ==========================================================================
  // Mockup Generation
  // ==========================================================================

  /**
   * Request mockup generation from a POD provider
   */
  generateMockups: adminProcedure
    .input(
      z.object({
        providerSlug: z.string(),
        productId: z.string(),
        variantIds: z.array(z.string()).optional(),
        artworkUrl: z.string().url(),
        placement: z.string().default("front"),
        styles: z.array(z.string()).default(["front"]),
        specialFinish: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get provider
      const provider = getProvider(input.providerSlug as "printful" | "gelato");

      // Request mockup generation
      const job = await provider.generateMockups({
        productId: input.productId,
        variantIds: input.variantIds,
        artworkUrl: input.artworkUrl,
        placement: input.placement,
        styles: input.styles as Array<"front" | "back" | "left" | "right" | "lifestyle">,
        specialFinish: input.specialFinish as
          | "gold_foil"
          | "silver_foil"
          | undefined,
      });

      // Store job record
      const [jobRecord] = await ctx.db
        .insert(mockupGenerationJobs)
        .values({
          providerSlug: input.providerSlug,
          providerTaskId: job.providerTaskId,
          productId: input.productId,
          artworkUrl: input.artworkUrl,
          placement: input.placement,
          styles: input.styles,
          specialFinish: input.specialFinish ?? null,
          status: "submitted",
          createdAt: new Date(),
        })
        .returning();

      return {
        jobId: jobRecord?.id,
        providerTaskId: job.providerTaskId,
        status: job.status,
      };
    }),

  /**
   * Check mockup generation job status
   */
  getGenerationJobStatus: adminProcedure
    .input(
      z.object({
        providerSlug: z.string(),
        taskId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const provider = getProvider(input.providerSlug as "printful" | "gelato");
      return provider.getMockupJobStatus(input.taskId);
    }),

  // ==========================================================================
  // Provider Info
  // ==========================================================================

  /**
   * Get available POD providers
   */
  getProviders: publicProcedure.query(() => {
    const available = getAvailableProviders();
    return available.map((slug) => POD_PROVIDER_CONFIGS[slug]);
  }),

  /**
   * Get mockup styles for a product
   */
  getMockupStyles: adminProcedure
    .input(
      z.object({
        providerSlug: z.string(),
        productId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const provider = getProvider(input.providerSlug as "printful" | "gelato");
      return provider.getMockupStyles(input.productId);
    }),
});
