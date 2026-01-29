# Mockup Management System with AI Analysis

## Overview

This document outlines the implementation plan for a comprehensive mockup management system that integrates Printful mockup generation with Claude AI-powered image analysis. The system is designed for a multi-user e-commerce platform serving families, schools, and artists.

---

## 1. Platform User Model

### 1.1 Age-Based User Categories

| Category | Age | Account Type | Capabilities |
|----------|-----|--------------|--------------|
| **Child** | Under 13 | Managed | Creates products; all actions require guardian approval (COPPA compliant) |
| **Teen** | 13-17 | Supervised | Full account with some guardian oversight; can publish with approval |
| **Adult** | 18+ | Full | Complete autonomy; can be Parent, Artist, or Teacher |

### 1.2 Role Types

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | Platform administrators | Full system access, user management, content moderation |
| **Parent/Guardian** | Adults managing children's accounts | Approve child content, manage family products, receive payouts |
| **Artist** | Adult creators (18+) | Create/publish products, receive payouts, full autonomy |
| **Teacher** | Educators managing student work | Link to students, manage classes, publish class projects |
| **Student** | Children linked to teachers | Create products within class context, teacher approval required |
| **Buyer** | Family members/customers | Purchase products, no creation capabilities |

### 1.3 Relationships

```
Guardian ←→ Child (1:many)
  - Guardian approves all child actions
  - Guardian receives payouts for child's sales
  - Multiple guardians can manage one child

Teacher ←→ Student (many:many via Class)
  - Teacher manages class roster
  - Teacher approves student publications
  - Students can be in multiple classes

Organization (Family/School/Team)
  - Groups users together
  - Shared revenue settings
  - Collective product management
```

---

## 2. Database Schema Design

### 2.1 Users & Authentication

```sql
-- Core users table
users
├── id (uuid, PK)
├── email (unique)
├── password_hash
├── display_name
├── avatar_url
├── date_of_birth (for age verification)
├── age_category (enum: 'child', 'teen', 'adult') -- computed from DOB
├── account_status (enum: 'pending', 'active', 'suspended', 'deleted')
├── email_verified_at
├── created_at
├── updated_at

-- User roles (a user can have multiple roles)
user_roles
├── id (PK)
├── user_id (FK → users)
├── role (enum: 'admin', 'parent', 'guardian', 'artist', 'teacher', 'student', 'buyer')
├── organization_id (FK → organizations, nullable)
├── granted_by (FK → users)
├── granted_at
├── revoked_at (nullable, for soft revocation)

-- Guardian-child relationships
guardian_relationships
├── id (PK)
├── guardian_id (FK → users) -- must be adult
├── child_id (FK → users) -- must be under 18
├── relationship_type (enum: 'parent', 'legal_guardian', 'authorized_adult')
├── is_primary (boolean) -- primary guardian for approvals
├── permissions (jsonb) -- granular permissions
├── verified_at -- identity verification timestamp
├── created_at

-- Teacher-student relationships (via classes)
classes
├── id (PK)
├── teacher_id (FK → users)
├── organization_id (FK → organizations, nullable) -- school
├── name
├── description
├── grade_level
├── school_year
├── is_active (boolean)
├── created_at

class_enrollments
├── id (PK)
├── class_id (FK → classes)
├── student_id (FK → users)
├── enrolled_at
├── removed_at (nullable)

-- Organizations (families, schools, teams)
organizations
├── id (PK)
├── name
├── type (enum: 'family', 'school', 'team', 'studio')
├── owner_id (FK → users)
├── settings (jsonb)
├── created_at
```

### 2.2 Stripe Connect Integration

```sql
-- Stripe Connect accounts for payouts
stripe_connect_accounts
├── id (PK)
├── user_id (FK → users)
├── stripe_account_id (Stripe Connect account ID)
├── account_type (enum: 'express', 'standard', 'custom')
├── charges_enabled (boolean)
├── payouts_enabled (boolean)
├── onboarding_complete (boolean)
├── default_currency
├── country
├── created_at
├── updated_at

-- Revenue sharing configuration
revenue_shares
├── id (PK)
├── product_id (FK → products)
├── recipient_id (FK → users)
├── percentage (decimal) -- e.g., 70.00 for 70%
├── is_primary (boolean) -- main recipient
├── created_at
```

### 2.3 Products with Ownership

```sql
-- Extended products table (modify existing)
products
├── ... existing fields ...
├── owner_id (FK → users) -- who created this
├── owner_type (enum: 'individual', 'class', 'organization')
├── class_id (FK → classes, nullable) -- if created in class context
├── organization_id (FK → organizations, nullable)
├── requires_approval (boolean) -- needs guardian/teacher/admin approval
├── approved_by (FK → users, nullable)
├── approved_at (timestamp, nullable)
├── rejection_reason (text, nullable)
├── platform_fee_percent (decimal) -- platform's cut
├── created_at
├── updated_at
```

### 2.4 Mockups with Workflow

```sql
-- Product mockups from Printful
product_mockups
├── id (uuid, PK)
├── product_id (FK → products)
├── variant_id (FK → product_variants, nullable)
│
├── -- Printful references --
├── printful_product_id (int)
├── printful_variant_id (int, nullable)
├── printful_task_key (varchar) -- mockup generation task
│
├── -- Mockup metadata --
├── mockup_style (enum: 'front', 'back', 'left', 'right', 'lifestyle',
│                       'model_male', 'model_female', 'closeup', 'flat', 'studio')
├── placement (varchar) -- 'front', 'back', 'sleeve', etc.
├── original_url (text) -- Printful-hosted URL
├── stored_url (text, nullable) -- Our S3 copy
├── thumbnail_url (text, nullable)
│
├── -- Workflow state --
├── workflow_status (enum, see below)
├── workflow_changed_at (timestamp)
├── workflow_changed_by (FK → users, nullable)
│
├── -- Selection state --
├── is_gallery_selected (boolean) -- final decision for gallery
├── display_order (int)
├── is_primary (boolean) -- main product image
│
├── -- Manual review tracking --
├── manually_reviewed (boolean)
├── manually_reviewed_by (FK → users, nullable)
├── manually_reviewed_at (timestamp, nullable)
├── manual_override_reason (text, nullable)
│
├── -- Generation metadata --
├── artwork_url (text) -- original artwork used
├── generation_status (enum: 'pending', 'processing', 'completed', 'failed')
├── generation_error (text, nullable)
├── created_at
├── updated_at

-- Workflow status enum values:
-- 'pending_generation'     - Waiting for Printful to generate
-- 'generation_failed'      - Printful generation error
-- 'pending_ai_review'      - Ready for Claude analysis
-- 'ai_approved'            - AI recommends include
-- 'ai_rejected'            - AI recommends exclude
-- 'ai_needs_review'        - AI uncertain, needs human
-- 'pending_human_review'   - In human review queue
-- 'human_approved'         - Human approved for gallery
-- 'human_rejected'         - Human rejected
-- 'published'              - Live in product gallery
-- 'archived'               - Removed from gallery
```

### 2.5 AI Analysis

```sql
-- Claude AI analysis results
mockup_analyses
├── id (uuid, PK)
├── mockup_id (FK → product_mockups)
│
├── -- Scores (0-100) --
├── design_visibility_score (int) -- Is artwork clearly visible?
├── color_harmony_score (int) -- Color clash detection
├── background_contrast_score (int) -- Design vs product contrast
├── overall_quality_score (int) -- Computed overall score
│
├── -- AI decision --
├── suggested_action (enum: 'approve', 'reject', 'needs_review')
├── confidence_level (int, 0-100) -- How confident is AI?
├── analysis_notes (text) -- Detailed AI explanation
├── issues_detected (jsonb) -- Array of issue strings
│
├── -- Model metadata --
├── model_used (varchar) -- e.g., 'claude-sonnet-4-20250514'
├── prompt_version (varchar) -- For tracking prompt changes
├── tokens_used (int) -- Cost tracking
├── latency_ms (int) -- Response time
│
├── -- Human feedback on AI decision --
├── human_agreed (boolean, nullable)
├── human_feedback (text, nullable)
├── human_feedback_by (FK → users, nullable)
├── human_feedback_at (timestamp, nullable)
│
├── analyzed_at (timestamp)

-- Audit log for all workflow changes
mockup_workflow_log
├── id (PK)
├── mockup_id (FK → product_mockups)
├── previous_status (varchar)
├── new_status (varchar)
├── changed_by (FK → users, nullable) -- null for system actions
├── change_source (enum: 'system', 'ai', 'human', 'bulk_action', 'api')
├── change_reason (text, nullable)
├── metadata (jsonb) -- Extra context
├── created_at
```

### 2.6 Mockup Generation Jobs

```sql
-- Track async mockup generation
mockup_generation_jobs
├── id (uuid, PK)
├── product_id (FK → products)
├── requested_by (FK → users)
│
├── -- Job configuration --
├── artwork_url (text)
├── requested_styles (jsonb) -- Array of style enums
├── requested_placements (jsonb) -- Array of placement strings
├── variant_ids (jsonb, nullable) -- Specific variants, or all
│
├── -- Printful task tracking --
├── printful_task_key (varchar, nullable)
├── status (enum: 'pending', 'submitted', 'processing', 'completed', 'failed')
├── error_message (text, nullable)
├── retry_count (int)
│
├── -- Progress --
├── total_mockups (int)
├── completed_mockups (int)
├── failed_mockups (int)
│
├── -- Timestamps --
├── created_at
├── started_at (nullable)
├── completed_at (nullable)
```

---

## 3. Workflow State Machine

### 3.1 State Diagram

```
                         ┌─────────────────────┐
                         │ pending_generation  │
                         └──────────┬──────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                                         ▼
    ┌──────────────────┐                      ┌──────────────────┐
    │ generation_failed│                      │ pending_ai_review│
    └──────────────────┘                      └────────┬─────────┘
               │                                       │
               │ (retry)                          AI Analysis
               └──────────────┐                        │
                              │    ┌───────────────────┼───────────────────┐
                              │    ▼                   ▼                   ▼
                        ┌───────────┐         ┌─────────────┐       ┌───────────┐
                        │ai_approved│         │ai_needs_    │       │ai_rejected│
                        └─────┬─────┘         │   review    │       └─────┬─────┘
                              │               └──────┬──────┘             │
                              │                      │                    │
    ┌─────────────────────────┴──────────────────────┴────────────────────┴─────┐
    │                                                                            │
    │                    ╔══════════════════════════════════════╗               │
    │                    ║  HUMAN CAN ALWAYS INTERVENE          ║               │
    │                    ║  (Override any state at any time)    ║               │
    │                    ╚══════════════════════════════════════╝               │
    │                                                                            │
    └────────────────────────────────┬───────────────────────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
               ┌───────────────┐         ┌───────────────┐
               │human_approved │         │human_rejected │
               └───────┬───────┘         └───────┬───────┘
                       │                         │
                       ▼                         ▼
               ┌───────────────┐         ┌───────────────┐
               │   published   │◄───────►│   archived    │
               └───────────────┘         └───────────────┘
```

### 3.2 State Transition Rules

| From State | To State | Trigger | Actor |
|------------|----------|---------|-------|
| `pending_generation` | `pending_ai_review` | Printful completes | System |
| `pending_generation` | `generation_failed` | Printful error | System |
| `generation_failed` | `pending_generation` | Retry requested | User/Admin |
| `pending_ai_review` | `ai_approved` | AI score >= 70, confidence >= 70 | AI |
| `pending_ai_review` | `ai_rejected` | AI score < 50 | AI |
| `pending_ai_review` | `ai_needs_review` | AI uncertain (50-69 or low confidence) | AI |
| `ai_needs_review` | `pending_human_review` | Auto-queue | System |
| `ai_approved` | `published` | Auto-publish enabled | System |
| `ai_approved` | `pending_human_review` | Manual review requested | User |
| `ai_rejected` | `pending_human_review` | User requests reconsideration | User |
| `pending_human_review` | `human_approved` | Human approves | User/Admin |
| `pending_human_review` | `human_rejected` | Human rejects | User/Admin |
| `human_approved` | `published` | Publish action | User/Admin |
| `human_rejected` | `archived` | Auto-archive | System |
| `published` | `archived` | User removes from gallery | User/Admin |
| `archived` | `published` | User restores | User/Admin |
| **ANY STATE** | `human_approved`/`human_rejected` | Manual override | User/Admin |

### 3.3 Key Principle: Human Always Has Control

- Any mockup can be manually reviewed regardless of current state
- Manual decisions always override AI recommendations
- All overrides are logged with reason for audit trail
- Bulk operations available for efficiency

---

## 4. Claude AI Image Analysis

### 4.1 Analysis Prompt

```
You are an expert image quality analyst for print-on-demand product mockups.
Analyze this mockup image for gallery inclusion.

Evaluate these criteria on a scale of 0-100:

1. **Design Visibility (0-100)**: Is the artwork clearly visible?
   - Is the design properly positioned on the product?
   - Is the design at an appropriate size (not too small/large)?
   - Is there any distortion, cropping, or positioning issues?

2. **Color Harmony (0-100)**: Are there color clashes?
   - Does the design color contrast appropriately with the product color?
   - Are there any clashing colors that look unprofessional?
   - Would the color combination appeal to customers?

3. **Background Contrast (0-100)**: Can you distinguish the design?
   - Can you easily see the design against the product background?
   - Is there sufficient contrast between design and product?
   - Would the design be visible in a thumbnail view?

4. **Overall Quality (0-100)**: General assessment
   - Does this mockup represent the product well?
   - Would a customer find this appealing?
   - Is this suitable for an e-commerce gallery?

Also provide:
- **Confidence Level (0-100)**: How confident are you in this assessment?
- **Issues Detected**: List specific problems found
- **Suggested Action**: 'approve' (>=70), 'reject' (<50), or 'needs_review' (50-69 or uncertain)

Respond in JSON format:
{
  "designVisibilityScore": <number>,
  "colorHarmonyScore": <number>,
  "backgroundContrastScore": <number>,
  "overallQualityScore": <number>,
  "confidenceLevel": <number>,
  "suggestedAction": "<approve|reject|needs_review>",
  "issuesDetected": ["<issue1>", "<issue2>", ...],
  "analysisNotes": "<detailed explanation>"
}
```

### 4.2 Analysis Thresholds

| Overall Score | Confidence | Suggested Action |
|---------------|------------|------------------|
| >= 70 | >= 70 | `approve` |
| < 50 | any | `reject` |
| 50-69 | any | `needs_review` |
| any | < 70 | `needs_review` |

### 4.3 Cost Estimation

- Model: Claude claude-sonnet-4-20250514 (vision)
- Estimated tokens per analysis: ~1,500 input + ~500 output
- Cost per analysis: ~$0.01-0.02
- Batch of 20 mockups: ~$0.20-0.40

---

## 5. Admin Review UI

### 5.1 Review Queue Views

| Queue | Filter | Purpose |
|-------|--------|---------|
| **Needs Review** | `ai_needs_review`, `pending_human_review` | AI flagged for human decision |
| **AI Rejected** | `ai_rejected`, `manually_reviewed = false` | Review AI rejections |
| **Low Confidence** | AI confidence < 70, not reviewed | Double-check uncertain AI |
| **All Pending** | Not `published` or `archived` | Everything needing action |
| **Ready to Publish** | `human_approved`, `is_gallery_selected = true` | Final publish queue |

### 5.2 UI Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Mockup Review Queue                                    [Filter: All ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Tabs: [Needs Review (12)] [AI Rejected (8)] [Low Confidence (5)] [All] │
│                                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│ │ [Mockup Image]  │ │ [Mockup Image]  │ │ [Mockup Image]  │            │
│ │                 │ │                 │ │                 │            │
│ │ Style: lifestyle│ │ Style: model_m  │ │ Style: closeup  │            │
│ │ Score: 58/100   │ │ Score: 42/100   │ │ Score: 65/100   │            │
│ │ Confidence: 45% │ │ Confidence: 82% │ │ Confidence: 55% │            │
│ │                 │ │                 │ │                 │            │
│ │ Issues:         │ │ Issues:         │ │ Issues:         │            │
│ │ • Low contrast  │ │ • Design hidden │ │ • Color clash   │            │
│ │                 │ │                 │ │                 │            │
│ │ [✓ Approve] [✗] │ │ [✓ Approve] [✗] │ │ [✓ Approve] [✗] │            │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                         │
│ Bulk: [Select All] [Approve Selected] [Reject Selected]                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Detail View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Mockup Review: T-Shirt - Lifestyle Shot                       [← Back] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────┐   ┌──────────────────────────────────┐   │
│  │                          │   │ AI Analysis                      │   │
│  │   [Large Mockup Image]   │   │                                  │   │
│  │                          │   │ Overall: 58/100  Confidence: 45% │   │
│  │                          │   │                                  │   │
│  │                          │   │ Design Visibility:  65/100       │   │
│  │                          │   │ Color Harmony:      72/100       │   │
│  │                          │   │ Background Contrast: 38/100 ⚠️    │   │
│  │                          │   │                                  │   │
│  └──────────────────────────┘   │ Recommendation: NEEDS REVIEW     │   │
│                                 │                                  │   │
│  [Zoom] [Compare Variants]      │ Issues:                          │   │
│                                 │ • White design on cream shirt    │   │
│                                 │   lacks sufficient contrast      │   │
│                                 │ • May be hard to see in          │   │
│                                 │   thumbnail view                 │   │
│                                 └──────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Your Decision                                                      ││
│  │                                                                    ││
│  │ (●) Approve for Gallery    ( ) Reject                             ││
│  │                                                                    ││
│  │ Reason (optional):                                                 ││
│  │ ┌────────────────────────────────────────────────────────────────┐││
│  │ │ Lifestyle context provides enough visual interest despite     │││
│  │ │ the low contrast. The overall composition works well.         │││
│  │ └────────────────────────────────────────────────────────────────┘││
│  │                                                                    ││
│  │ [ ] Set as primary image    Display order: [3 ▼]                  ││
│  │                                                                    ││
│  │                    [Save Decision]  [Skip]                         ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  History:                                                               │
│  • Jan 29 14:32 - AI analyzed: needs_review (confidence: 45%)          │
│  • Jan 29 14:30 - Mockup generated from Printful                       │
│  • Jan 29 14:28 - Generation requested by admin@example.com            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Printful Mockup Generation

### 6.1 Available Mockup Styles

| Style | Description | Use Case |
|-------|-------------|----------|
| `front` | Flat, front view | Default product shot |
| `back` | Flat, back view | Back print designs |
| `left` / `right` | Side views | Side prints |
| `lifestyle` | Product in context | Hero images |
| `model_male` | On male model | Apparel showcase |
| `model_female` | On female model | Apparel showcase |
| `closeup` | Print area detail | Show design quality |
| `flat` | Flat lay photography | Clean product shots |
| `studio` | Studio lighting | Professional shots |

### 6.2 Generation Flow

```
1. User uploads artwork
   └─→ Store in S3

2. User selects product + variants + styles
   └─→ Create mockup_generation_job

3. Submit to Printful
   POST /mockup-generator/create-task/{product_id}
   └─→ Store task_key

4. Poll for completion (or use webhook)
   GET /mockup-generator/task
   └─→ Get mockup URLs

5. Store mockups
   └─→ Download to S3 (optional)
   └─→ Create product_mockups records
   └─→ Set status: pending_ai_review

6. Trigger AI analysis
   └─→ Queue batch analysis job
```

### 6.3 API Endpoints Needed

```typescript
// New tRPC procedures in admin-products router

// Generate mockups for a product
generateMockups: adminProcedure
  .input(z.object({
    productId: z.number(),
    artworkUrl: z.string().url(),
    styles: z.array(mockupStyleEnum),
    variantIds: z.array(z.number()).optional(),
  }))
  .mutation(...)

// Get mockup generation job status
getMockupJobStatus: adminProcedure
  .input(z.object({ jobId: z.string().uuid() }))
  .query(...)

// List mockups for review
listMockupsForReview: adminProcedure
  .input(z.object({
    queue: z.enum(['needs_review', 'ai_rejected', 'low_confidence', 'all']),
    productId: z.number().optional(),
    limit: z.number().default(20),
    offset: z.number().default(0),
  }))
  .query(...)

// Submit review decision
reviewMockup: adminProcedure
  .input(z.object({
    mockupId: z.string().uuid(),
    decision: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
    setAsPrimary: z.boolean().optional(),
    displayOrder: z.number().optional(),
  }))
  .mutation(...)

// Bulk review
bulkReviewMockups: adminProcedure
  .input(z.object({
    mockupIds: z.array(z.string().uuid()),
    decision: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
  }))
  .mutation(...)

// Trigger AI analysis
analyzeMockups: adminProcedure
  .input(z.object({
    mockupIds: z.array(z.string().uuid()),
  }))
  .mutation(...)

// Apply AI suggestions
applyAiSuggestions: adminProcedure
  .input(z.object({
    productId: z.number(),
    autoPublish: z.boolean().default(false),
  }))
  .mutation(...)
```

---

## 7. Permission System

### 7.1 Permission Matrix

| Action | Admin | Parent (own) | Artist (own) | Teacher (class) | Teen (own) | Child |
|--------|-------|--------------|--------------|-----------------|------------|-------|
| Generate mockups | ✅ | ✅ | ✅ | ✅ | ✅* | ✅* |
| View mockups | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Run AI analysis | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Review mockups | ✅ | ✅ | ✅ | ✅ | ✅* | ❌ |
| Override AI | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publish mockups | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| View all products | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

`✅*` = Requires guardian approval
`⏳` = Requires guardian/teacher approval

### 7.2 Ownership Rules

```typescript
// Check if user can access a mockup
function canAccessMockup(user: User, mockup: Mockup): boolean {
  // Admin can access all
  if (user.roles.includes('admin')) return true;

  // Check product ownership
  const product = mockup.product;

  // Direct owner
  if (product.ownerId === user.id) return true;

  // Guardian of owner
  if (user.guardiansOf.includes(product.ownerId)) return true;

  // Teacher of class product
  if (product.classId && user.teachesClasses.includes(product.classId)) return true;

  return false;
}
```

---

## 8. External Tooling Requirements

### 8.1 Required Services

| Service | Purpose | Notes |
|---------|---------|-------|
| **PostgreSQL** | Primary database | Neon, Supabase, or Railway recommended |
| **Anthropic API** | Claude AI image analysis | Need API key with vision access |
| **Printful API** | Mockup generation & fulfillment | Existing integration |
| **AWS S3 / DigitalOcean Spaces** | File storage | Existing integration |
| **Upstash** | Background job queues, rate limiting | For async processing |
| **Stripe Connect** | Marketplace payouts | Future: creator payments |

### 8.2 Upstash Integration

**QStash** for background jobs:
- Mockup generation polling
- Batch AI analysis
- Webhook processing

**Redis** for:
- Rate limiting (API & AI calls)
- Caching (Printful catalog, user sessions)
- Real-time job progress

```typescript
// Example: Queue AI analysis job
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN });

await qstash.publishJSON({
  url: `${process.env.APP_URL}/api/jobs/analyze-mockups`,
  body: { mockupIds: ["uuid1", "uuid2", "uuid3"] },
  retries: 3,
  delay: "5s",
});
```

### 8.3 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Printful
PRINTFUL_API_KEY="..."

# Anthropic (Claude AI)
ANTHROPIC_API_KEY="sk-ant-..."

# Storage (S3-compatible)
S3_ENDPOINT="https://..."
S3_REGION="us-east-1"
S3_BUCKET="artfulfam-mockups"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."

# Upstash
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
QSTASH_TOKEN="..."
QSTASH_CURRENT_SIGNING_KEY="..."
QSTASH_NEXT_SIGNING_KEY="..."

# Stripe (Future)
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
```

---

## 9. Implementation Phases

### Phase 1: Core Mockup System (Current Sprint)

1. ✅ Database schema for mockups, analyses, workflow
2. ⬜ Extend Printful client for mockup generation
3. ⬜ Create mockup generation job system
4. ⬜ Basic admin mockup list/grid UI
5. ⬜ Manual selection toggle (no AI yet)

### Phase 2: AI Analysis Integration

1. ⬜ Add Anthropic SDK dependency
2. ⬜ Create Claude image analyzer module
3. ⬜ Implement analysis prompt and scoring
4. ⬜ Queue-based batch analysis with Upstash
5. ⬜ Review queue UI with AI scores

### Phase 3: Workflow & Review Queue

1. ⬜ Workflow state machine implementation
2. ⬜ Audit logging for all state changes
3. ⬜ Review queue filters and views
4. ⬜ Detail view with full control
5. ⬜ Bulk operations

### Phase 4: User System Foundation

1. ⬜ Users table and authentication
2. ⬜ Role system (admin, parent, artist, teacher)
3. ⬜ Guardian-child relationships
4. ⬜ Permission middleware
5. ⬜ Product ownership

### Phase 5: Multi-User & Marketplace

1. ⬜ Class/organization system
2. ⬜ Stripe Connect onboarding
3. ⬜ Revenue sharing configuration
4. ⬜ Creator dashboard
5. ⬜ Approval workflows for minors

---

## 10. File Structure

```
src/
├── server/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── base.ts
│   │   │   ├── users.ts          # NEW: Users, roles, relationships
│   │   │   ├── products.ts       # MODIFY: Add ownership
│   │   │   ├── mockups.ts        # NEW: Mockups, analyses, jobs
│   │   │   ├── printful.ts
│   │   │   ├── orders.ts
│   │   │   └── cms.ts
│   │   └── index.ts
│   │
│   ├── api/
│   │   ├── routers/
│   │   │   ├── admin-products.ts # MODIFY: Add mockup procedures
│   │   │   ├── admin-mockups.ts  # NEW: Mockup management
│   │   │   ├── admin-users.ts    # NEW: User management (Phase 4)
│   │   │   └── ...
│   │   ├── trpc.ts
│   │   └── root.ts
│   │
│   ├── printful/
│   │   ├── client.ts             # MODIFY: Add mockup methods
│   │   └── mockup-generator.ts   # NEW: Generation logic
│   │
│   ├── ai/
│   │   ├── mockup-analyzer.ts    # NEW: Claude integration
│   │   └── prompts.ts            # NEW: Centralized prompts
│   │
│   ├── workflow/
│   │   ├── state-machine.ts      # NEW: Workflow logic
│   │   ├── permissions.ts        # NEW: Permission checks
│   │   └── audit.ts              # NEW: Audit logging
│   │
│   └── jobs/                      # NEW: Background jobs
│       ├── analyze-mockups.ts
│       └── poll-printful.ts
│
├── app/
│   ├── admin/
│   │   ├── mockups/
│   │   │   ├── page.tsx          # NEW: Mockup management
│   │   │   ├── review/
│   │   │   │   └── page.tsx      # NEW: Review queue
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # NEW: Detail view
│   │   │   └── generate/
│   │   │       └── page.tsx      # NEW: Generation form
│   │   └── ...
│   └── api/
│       └── jobs/
│           └── [...path]/
│               └── route.ts      # NEW: Job webhooks
│
└── components/
    └── admin/
        ├── mockup-card.tsx       # NEW
        ├── mockup-grid.tsx       # NEW
        ├── review-queue.tsx      # NEW
        ├── ai-analysis-panel.tsx # NEW
        └── workflow-badge.tsx    # NEW
```

---

## 11. Open Questions

1. **Authentication**: Use NextAuth.js, Clerk, or custom auth?
2. **Age verification**: How to verify DOB for COPPA compliance?
3. **Guardian verification**: How to verify guardian relationships?
4. **Moderation**: Should AI also check for inappropriate content?
5. **Pricing**: Should mockup generation have usage limits?

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| AI analysis accuracy (human agreement rate) | > 85% |
| Mockup generation success rate | > 95% |
| Average review queue processing time | < 24 hours |
| Human override rate on AI approvals | < 15% |
| Human override rate on AI rejections | < 25% |
