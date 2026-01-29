/**
 * Mockup Workflow State Machine
 *
 * Manages the lifecycle of mockup generation and approval:
 * 1. Generation (pending -> completed/failed)
 * 2. AI Review (auto-approval, rejection, or flagging for review)
 * 3. Human Review (admin/parent/artist can override any decision)
 * 4. Publication (publish to product catalog)
 *
 * Key principle: Humans can always override any automated decision
 */

import { eq, and } from "drizzle-orm";
import type { db as DbClient } from "@/server/db";
import {
  productMockups,
  mockupWorkflowLog,
  mockupAnalyses,
  type MockupWorkflowStatus,
} from "@/server/db/schema/mockups";
import {
  analyzeMockup,
  type MockupAnalysisResult,
  type AnalyzerOptions,
} from "@/server/ai/mockup-analyzer";

// ============================================================================
// Types
// ============================================================================

export type WorkflowAction =
  | "submit_for_generation"
  | "generation_complete"
  | "generation_failed"
  | "submit_for_ai_review"
  | "ai_approve"
  | "ai_reject"
  | "ai_flag_for_review"
  | "submit_for_human_review"
  | "human_approve"
  | "human_reject"
  | "human_request_changes"
  | "publish"
  | "unpublish"
  | "archive"
  | "restore";

export interface TransitionResult {
  success: boolean;
  previousStatus: MockupWorkflowStatus;
  newStatus: MockupWorkflowStatus;
  error?: string;
}

export interface WorkflowContext {
  db: typeof DbClient;
  userId: string;
  userRole?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid state transitions
 * Format: fromStatus -> [allowedActions]
 */
const STATE_TRANSITIONS: Record<
  MockupWorkflowStatus,
  Partial<Record<WorkflowAction, MockupWorkflowStatus>>
> = {
  pending_generation: {
    generation_complete: "pending_ai_review",
    generation_failed: "generation_failed",
  },
  generation_failed: {
    submit_for_generation: "pending_generation",
    archive: "archived",
  },
  pending_ai_review: {
    ai_approve: "ai_approved",
    ai_reject: "ai_rejected",
    ai_flag_for_review: "ai_needs_review",
    // Human can always override and skip AI
    human_approve: "human_approved",
    human_reject: "human_rejected",
    submit_for_human_review: "pending_human_review",
  },
  ai_approved: {
    publish: "published",
    submit_for_human_review: "pending_human_review",
    // Human can override AI approval
    human_reject: "human_rejected",
    archive: "archived",
  },
  ai_rejected: {
    // Human can override AI rejection
    submit_for_human_review: "pending_human_review",
    human_approve: "human_approved",
    archive: "archived",
  },
  ai_needs_review: {
    submit_for_human_review: "pending_human_review",
    human_approve: "human_approved",
    human_reject: "human_rejected",
    archive: "archived",
  },
  pending_human_review: {
    human_approve: "human_approved",
    human_reject: "human_rejected",
    human_request_changes: "ai_needs_review", // Back to needing work
  },
  human_approved: {
    publish: "published",
    // Can still reject after approval
    human_reject: "human_rejected",
    archive: "archived",
  },
  human_rejected: {
    // Can always reconsider
    human_approve: "human_approved",
    submit_for_human_review: "pending_human_review",
    archive: "archived",
  },
  published: {
    unpublish: "human_approved", // Back to approved but not published
    human_reject: "human_rejected",
    archive: "archived",
  },
  archived: {
    restore: "pending_human_review", // Restore goes to human review
  },
};

// ============================================================================
// Workflow Manager Class
// ============================================================================

export class MockupWorkflowManager {
  constructor(private db: typeof DbClient) {}

  /**
   * Execute a workflow transition
   */
  async transition(
    mockupId: string,
    action: WorkflowAction,
    context: Omit<WorkflowContext, "db">
  ): Promise<TransitionResult> {
    // Get current mockup state
    const mockup = await this.db.query.productMockups.findFirst({
      where: eq(productMockups.id, mockupId),
    });

    if (!mockup) {
      return {
        success: false,
        previousStatus: "pending_generation",
        newStatus: "pending_generation",
        error: "Mockup not found",
      };
    }

    const currentStatus = mockup.workflowStatus as MockupWorkflowStatus;
    const allowedTransitions = STATE_TRANSITIONS[currentStatus];
    const newStatus = allowedTransitions?.[action];

    if (!newStatus) {
      return {
        success: false,
        previousStatus: currentStatus,
        newStatus: currentStatus,
        error: `Invalid transition: cannot ${action} from ${currentStatus}`,
      };
    }

    // Perform the transition
    const now = new Date();

    await this.db.transaction(async (tx) => {
      // Update mockup status
      await tx
        .update(productMockups)
        .set({
          workflowStatus: newStatus,
          updatedAt: now,
          // Track reviewer info for human actions
          ...(action.startsWith("human_") && {
            reviewedBy: context.userId,
            reviewedAt: now,
          }),
          // Track publication
          ...(action === "publish" && {
            publishedAt: now,
          }),
          ...(action === "unpublish" && {
            publishedAt: null,
          }),
        })
        .where(eq(productMockups.id, mockupId));

      // Log the transition
      await tx.insert(mockupWorkflowLog).values({
        mockupId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        action,
        performedBy: context.userId,
        performedByRole: context.userRole,
        reason: context.reason,
        metadata: context.metadata,
        createdAt: now,
      });
    });

    return {
      success: true,
      previousStatus: currentStatus,
      newStatus,
    };
  }

  /**
   * Run AI analysis and auto-transition based on results
   */
  async runAiReview(
    mockupId: string,
    options?: AnalyzerOptions
  ): Promise<{
    analysis: MockupAnalysisResult;
    transition: TransitionResult;
  }> {
    // Get mockup
    const mockup = await this.db.query.productMockups.findFirst({
      where: eq(productMockups.id, mockupId),
    });

    if (!mockup) {
      throw new Error("Mockup not found");
    }

    if (!mockup.imageUrl) {
      throw new Error("Mockup has no image URL");
    }

    // Run AI analysis
    const analysis = await analyzeMockup(mockup.imageUrl, options);

    // Store analysis results
    await this.db.insert(mockupAnalyses).values({
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

    // Determine action based on recommendation
    let action: WorkflowAction;
    switch (analysis.recommendation) {
      case "approve":
        action = "ai_approve";
        break;
      case "reject":
        action = "ai_reject";
        break;
      case "needs_review":
      default:
        action = "ai_flag_for_review";
        break;
    }

    // Execute transition
    const transition = await this.transition(mockupId, action, {
      userId: "system",
      userRole: "ai",
      reason: analysis.explanation,
      metadata: {
        overallScore: analysis.overallScore,
        recommendation: analysis.recommendation,
        issueCount: analysis.issues.length,
      },
    });

    return { analysis, transition };
  }

  /**
   * Get available actions for a mockup
   */
  getAvailableActions(
    currentStatus: MockupWorkflowStatus,
    userRole: string
  ): WorkflowAction[] {
    const transitions = STATE_TRANSITIONS[currentStatus];
    if (!transitions) return [];

    const actions = Object.keys(transitions) as WorkflowAction[];

    // Filter actions based on role
    // Admins can do everything
    if (userRole === "admin") {
      return actions;
    }

    // AI system can only do AI actions
    if (userRole === "ai") {
      return actions.filter((a) => a.startsWith("ai_") || a.startsWith("generation_"));
    }

    // Parents/artists can do human review actions
    if (["parent", "artist", "guardian"].includes(userRole)) {
      return actions.filter(
        (a) =>
          a.startsWith("human_") ||
          a === "publish" ||
          a === "unpublish" ||
          a === "archive" ||
          a === "submit_for_human_review"
      );
    }

    // Default: only view, no actions
    return [];
  }

  /**
   * Bulk transition multiple mockups
   */
  async bulkTransition(
    mockupIds: string[],
    action: WorkflowAction,
    context: Omit<WorkflowContext, "db">
  ): Promise<Map<string, TransitionResult>> {
    const results = new Map<string, TransitionResult>();

    for (const mockupId of mockupIds) {
      const result = await this.transition(mockupId, action, context);
      results.set(mockupId, result);
    }

    return results;
  }

  /**
   * Get workflow history for a mockup
   */
  async getWorkflowHistory(mockupId: string) {
    return this.db.query.mockupWorkflowLog.findMany({
      where: eq(mockupWorkflowLog.mockupId, mockupId),
      orderBy: (log, { desc }) => [desc(log.createdAt)],
    });
  }

  /**
   * Get all mockups in a specific status
   */
  async getMockupsByStatus(status: MockupWorkflowStatus, limit = 50) {
    return this.db.query.productMockups.findMany({
      where: eq(productMockups.workflowStatus, status),
      limit,
      orderBy: (mockups, { desc }) => [desc(mockups.createdAt)],
    });
  }

  /**
   * Get mockups pending human review
   */
  async getPendingReview(limit = 50) {
    return this.db.query.productMockups.findMany({
      where: (mockups, { or, eq: eqOp }) =>
        or(
          eqOp(mockups.workflowStatus, "pending_human_review"),
          eqOp(mockups.workflowStatus, "ai_needs_review")
        ),
      limit,
      orderBy: (mockups, { asc }) => [asc(mockups.createdAt)],
    });
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

let workflowManager: MockupWorkflowManager | null = null;

/**
 * Get the workflow manager instance
 * Note: Requires db to be passed on first call
 */
export function getWorkflowManager(db?: typeof DbClient): MockupWorkflowManager {
  if (!workflowManager) {
    if (!db) {
      throw new Error("Database client required for first initialization");
    }
    workflowManager = new MockupWorkflowManager(db);
  }
  return workflowManager;
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(
  fromStatus: MockupWorkflowStatus,
  action: WorkflowAction
): boolean {
  const transitions = STATE_TRANSITIONS[fromStatus];
  return !!transitions?.[action];
}

/**
 * Get the target status for a transition
 */
export function getTargetStatus(
  fromStatus: MockupWorkflowStatus,
  action: WorkflowAction
): MockupWorkflowStatus | null {
  const transitions = STATE_TRANSITIONS[fromStatus];
  return transitions?.[action] ?? null;
}
