/**
 * Claude AI Mockup Analyzer
 *
 * Uses Claude's vision capabilities to analyze product mockups for:
 * - Artwork visibility (is the design clearly visible?)
 * - Color harmony (any clashing colors?)
 * - Contrast (does the artwork blend into the background?)
 * - Overall quality assessment
 *
 * Requires: @anthropic-ai/sdk
 * Install: pnpm add @anthropic-ai/sdk
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Analysis result for a single mockup
 */
export interface MockupAnalysisResult {
  /** Overall quality score (0-100) */
  overallScore: number;

  /** Visibility score - is artwork clearly visible? (0-100) */
  visibilityScore: number;

  /** Color harmony score - do colors work together? (0-100) */
  colorHarmonyScore: number;

  /** Contrast score - does artwork stand out from background? (0-100) */
  contrastScore: number;

  /** Composition score - is artwork well positioned? (0-100) */
  compositionScore: number;

  /** Recommended action based on scores */
  recommendation: "approve" | "needs_review" | "reject";

  /** Specific issues found */
  issues: MockupIssue[];

  /** Positive aspects of the mockup */
  strengths: string[];

  /** Detailed analysis explanation */
  explanation: string;

  /** Confidence level in the analysis (0-100) */
  confidence: number;

  /** Raw response from Claude for debugging */
  rawResponse?: string;
}

export interface MockupIssue {
  /** Type of issue */
  type:
    | "low_visibility"
    | "color_clash"
    | "low_contrast"
    | "poor_positioning"
    | "cropping"
    | "quality"
    | "other";

  /** Severity: minor issues can still be approved */
  severity: "minor" | "moderate" | "severe";

  /** Human-readable description */
  description: string;

  /** Suggested fix if applicable */
  suggestion?: string;
}

export interface AnalyzerOptions {
  /** Minimum overall score for auto-approval */
  approvalThreshold?: number;

  /** Minimum score for "needs review" (below this = reject) */
  reviewThreshold?: number;

  /** Include raw Claude response in results */
  includeRawResponse?: boolean;

  /** Product type for context (e.g., "t-shirt", "canvas print") */
  productType?: string;

  /** Special finish if applicable */
  specialFinish?: string;

  /** Variant color for better context */
  variantColor?: string;
}

// ============================================================================
// Zod Schemas for Structured Output
// ============================================================================

const IssueSchema = z.object({
  type: z.enum([
    "low_visibility",
    "color_clash",
    "low_contrast",
    "poor_positioning",
    "cropping",
    "quality",
    "other",
  ]),
  severity: z.enum(["minor", "moderate", "severe"]),
  description: z.string(),
  suggestion: z.string().optional(),
});

const AnalysisResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  visibilityScore: z.number().min(0).max(100),
  colorHarmonyScore: z.number().min(0).max(100),
  contrastScore: z.number().min(0).max(100),
  compositionScore: z.number().min(0).max(100),
  issues: z.array(IssueSchema),
  strengths: z.array(z.string()),
  explanation: z.string(),
  confidence: z.number().min(0).max(100),
});

type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

// ============================================================================
// Mockup Analyzer Class
// ============================================================================

export class MockupAnalyzer {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model = "claude-sonnet-4-20250514") {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        "ANTHROPIC_API_KEY is required. Set environment variable or pass apiKey to constructor."
      );
    }

    this.client = new Anthropic({ apiKey: key });
    this.model = model;
  }

  /**
   * Analyze a single mockup image
   */
  async analyzeMockup(
    imageUrl: string,
    options: AnalyzerOptions = {}
  ): Promise<MockupAnalysisResult> {
    const {
      approvalThreshold = 75,
      reviewThreshold = 50,
      includeRawResponse = false,
      productType,
      specialFinish,
      variantColor,
    } = options;

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt({
      productType,
      specialFinish,
      variantColor,
    });

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "url",
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const rawText = textContent.text;

      // Parse JSON from response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const analysis = AnalysisResponseSchema.parse(parsed);

      // Determine recommendation based on scores
      const recommendation = this.determineRecommendation(
        analysis.overallScore,
        analysis.issues,
        approvalThreshold,
        reviewThreshold
      );

      return {
        ...analysis,
        recommendation,
        rawResponse: includeRawResponse ? rawText : undefined,
      };
    } catch (error) {
      // If Claude API fails, return a needs_review result
      console.error("Mockup analysis failed:", error);

      return {
        overallScore: 0,
        visibilityScore: 0,
        colorHarmonyScore: 0,
        contrastScore: 0,
        compositionScore: 0,
        recommendation: "needs_review",
        issues: [
          {
            type: "other",
            severity: "moderate",
            description: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            suggestion: "Manual review required",
          },
        ],
        strengths: [],
        explanation: "Automated analysis failed. Please review manually.",
        confidence: 0,
        rawResponse: includeRawResponse
          ? `Error: ${error instanceof Error ? error.message : "Unknown"}`
          : undefined,
      };
    }
  }

  /**
   * Analyze multiple mockups in batch
   */
  async analyzeBatch(
    mockups: Array<{ id: string; imageUrl: string }>,
    options: AnalyzerOptions = {}
  ): Promise<Map<string, MockupAnalysisResult>> {
    const results = new Map<string, MockupAnalysisResult>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 3;
    for (let i = 0; i < mockups.length; i += concurrencyLimit) {
      const batch = mockups.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(async (mockup) => {
          const result = await this.analyzeMockup(mockup.imageUrl, options);
          return { id: mockup.id, result };
        })
      );

      for (const { id, result } of batchResults) {
        results.set(id, result);
      }
    }

    return results;
  }

  /**
   * Compare multiple mockups and rank them
   */
  async compareAndRank(
    mockups: Array<{ id: string; imageUrl: string }>,
    options: AnalyzerOptions = {}
  ): Promise<Array<{ id: string; rank: number; analysis: MockupAnalysisResult }>> {
    const analyses = await this.analyzeBatch(mockups, options);

    // Convert to array and sort by overall score
    const ranked = Array.from(analyses.entries())
      .map(([id, analysis]) => ({ id, analysis }))
      .sort((a, b) => b.analysis.overallScore - a.analysis.overallScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return ranked;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private buildSystemPrompt(): string {
    return `You are an expert visual quality analyst for e-commerce product mockups. Your job is to evaluate product mockups (like t-shirts, prints, canvases with artwork) for quality and sellability.

You must analyze images and provide structured JSON feedback about:
1. **Visibility**: Can the artwork/design be clearly seen? Is it obscured, too small, or cut off?
2. **Color Harmony**: Do the artwork colors work well with the product color? Are there clashing colors?
3. **Contrast**: Does the artwork stand out from the product background, or does it blend in and get lost?
4. **Composition**: Is the artwork well-positioned? Is it centered appropriately? Are there cropping issues?

Scoring Guidelines:
- 90-100: Excellent - ready for premium showcase
- 75-89: Good - suitable for catalog, minor improvements possible
- 50-74: Needs Review - some issues that may affect sales
- Below 50: Reject - significant problems that would hurt sales

Be thorough but fair. Focus on objective quality issues that would affect a buyer's perception.

IMPORTANT: Always respond with valid JSON matching this exact structure:
{
  "overallScore": number (0-100),
  "visibilityScore": number (0-100),
  "colorHarmonyScore": number (0-100),
  "contrastScore": number (0-100),
  "compositionScore": number (0-100),
  "issues": [
    {
      "type": "low_visibility" | "color_clash" | "low_contrast" | "poor_positioning" | "cropping" | "quality" | "other",
      "severity": "minor" | "moderate" | "severe",
      "description": "string",
      "suggestion": "string (optional)"
    }
  ],
  "strengths": ["string"],
  "explanation": "string (2-3 sentences summarizing the analysis)",
  "confidence": number (0-100, your confidence in this assessment)
}`;
  }

  private buildUserPrompt(context: {
    productType?: string;
    specialFinish?: string;
    variantColor?: string;
  }): string {
    let prompt = "Analyze this product mockup for quality and sellability.";

    if (context.productType) {
      prompt += `\n\nProduct type: ${context.productType}`;
    }
    if (context.variantColor) {
      prompt += `\nProduct color: ${context.variantColor}`;
    }
    if (context.specialFinish) {
      prompt += `\nSpecial finish: ${context.specialFinish} (consider how this finish affects visibility)`;
    }

    prompt += "\n\nProvide your analysis as JSON.";

    return prompt;
  }

  private determineRecommendation(
    overallScore: number,
    issues: MockupIssue[],
    approvalThreshold: number,
    reviewThreshold: number
  ): "approve" | "needs_review" | "reject" {
    // Any severe issue triggers review regardless of score
    const hasSevereIssue = issues.some((i) => i.severity === "severe");
    if (hasSevereIssue) {
      return overallScore >= reviewThreshold ? "needs_review" : "reject";
    }

    // Multiple moderate issues also trigger review
    const moderateIssues = issues.filter((i) => i.severity === "moderate");
    if (moderateIssues.length >= 2) {
      return overallScore >= approvalThreshold ? "needs_review" : "reject";
    }

    // Score-based decision
    if (overallScore >= approvalThreshold) {
      return "approve";
    }
    if (overallScore >= reviewThreshold) {
      return "needs_review";
    }
    return "reject";
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

let defaultAnalyzer: MockupAnalyzer | null = null;

/**
 * Get or create the default analyzer instance
 */
export function getDefaultAnalyzer(): MockupAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new MockupAnalyzer();
  }
  return defaultAnalyzer;
}

/**
 * Analyze a mockup using the default analyzer
 */
export async function analyzeMockup(
  imageUrl: string,
  options?: AnalyzerOptions
): Promise<MockupAnalysisResult> {
  return getDefaultAnalyzer().analyzeMockup(imageUrl, options);
}

/**
 * Analyze multiple mockups using the default analyzer
 */
export async function analyzeMockupBatch(
  mockups: Array<{ id: string; imageUrl: string }>,
  options?: AnalyzerOptions
): Promise<Map<string, MockupAnalysisResult>> {
  return getDefaultAnalyzer().analyzeBatch(mockups, options);
}
