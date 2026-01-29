# Mockup Management System with AI Analysis

## Overview

This document outlines the implementation plan for a comprehensive mockup management system that integrates **multiple Print-on-Demand (POD) providers** with Claude AI-powered image analysis. The system is designed for a multi-user e-commerce platform serving families, schools, and artists.

**Supported POD Providers:**
- **Printful** - Apparel, accessories, home goods
- **Gelato** - Premium prints, gold foil, fine art
- **Future providers** - Extensible architecture for adding more

---

## 1. Multi-POD Provider Architecture

### 1.1 Provider Registry

The system uses an abstracted provider layer to support multiple POD services with different capabilities.

```typescript
// Provider capability flags
interface PODProviderCapabilities {
  mockupGeneration: boolean;      // Can generate mockups
  mockupStyles: string[];         // Available styles
  specialFinishes: string[];      // Gold foil, embossing, etc.
  productCategories: string[];    // Apparel, prints, etc.
  webhookSupport: boolean;        // Async notifications
  apiVersion: string;
}

// Provider registry
const POD_PROVIDERS = {
  printful: {
    name: 'Printful',
    slug: 'printful',
    apiBaseUrl: 'https://api.printful.com',
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ['front', 'back', 'lifestyle', 'model_male', 'model_female', 'closeup', 'flat'],
      specialFinishes: ['embroidery', 'dtg', 'sublimation'],
      productCategories: ['apparel', 'accessories', 'home_decor', 'bags'],
      webhookSupport: true,
      apiVersion: 'v2',
    },
  },
  gelato: {
    name: 'Gelato',
    slug: 'gelato',
    apiBaseUrl: 'https://api.gelato.com',
    capabilities: {
      mockupGeneration: true,
      mockupStyles: ['front', 'lifestyle', 'detail', 'room_context'],
      specialFinishes: ['gold_foil', 'silver_foil', 'spot_uv', 'embossing', 'fine_art'],
      productCategories: ['prints', 'posters', 'canvas', 'cards', 'photobooks'],
      webhookSupport: true,
      apiVersion: 'v4',
    },
  },
  // Future providers can be added here
} as const;
```

### 1.2 Provider-Specific Features

| Provider | Unique Features | Best For |
|----------|-----------------|----------|
| **Printful** | Wide apparel selection, embroidery, fast US fulfillment | T-shirts, hoodies, hats, mugs |
| **Gelato** | Gold/silver foil, fine art prints, global print network | Art prints, premium cards, posters |
| **Future: Gooten** | Diverse product catalog | Home goods, phone cases |
| **Future: SPOD** | Fast EU fulfillment | European customers |

### 1.3 Unified Provider Interface

```typescript
// Abstract interface all providers must implement
interface PODProvider {
  readonly slug: string;
  readonly name: string;

  // Catalog
  listProducts(options?: ListProductsOptions): Promise<CatalogProduct[]>;
  getProduct(productId: string): Promise<CatalogProduct>;
  getProductVariants(productId: string): Promise<CatalogVariant[]>;

  // Mockups
  generateMockups(request: MockupRequest): Promise<MockupJob>;
  getMockupJobStatus(jobId: string): Promise<MockupJobStatus>;
  getMockupStyles(productId: string): Promise<MockupStyle[]>;

  // Orders (future)
  createOrder(order: OrderRequest): Promise<Order>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;

  // Webhooks
  verifyWebhook(payload: unknown, signature: string): boolean;
  parseWebhookEvent(payload: unknown): WebhookEvent;
}

// Normalized types across providers
interface CatalogProduct {
  providerId: string;           // Provider's internal ID
  providerSlug: string;         // 'printful' | 'gelato' | etc.
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  basePrice: { amount: number; currency: string };
  specialFinishes?: string[];   // ['gold_foil', 'embossing']
  availableRegions: string[];
}

interface MockupRequest {
  productId: string;
  variantIds?: string[];
  artworkUrl: string;
  placement: string;
  styles: string[];
  specialFinish?: string;       // 'gold_foil' for Gelato
}
```

---

## 2. Platform User Model

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

### 2.4 POD Providers Registry

```sql
-- Registered POD providers
pod_providers
├── id (PK)
├── slug (varchar, unique) -- 'printful', 'gelato', etc.
├── name (varchar) -- 'Printful', 'Gelato'
├── api_base_url (text)
├── is_active (boolean)
├── capabilities (jsonb) -- mockup styles, special finishes, etc.
├── settings (jsonb) -- provider-specific config
├── created_at
├── updated_at

-- Provider API credentials (encrypted)
pod_provider_credentials
├── id (PK)
├── provider_id (FK → pod_providers)
├── credential_type (enum: 'api_key', 'oauth', 'webhook_secret')
├── encrypted_value (text) -- encrypted API key/token
├── expires_at (timestamp, nullable)
├── created_at
├── updated_at
```

### 2.5 Products with Provider Linking

```sql
-- Product variants linked to POD providers
product_variant_pod_links
├── id (PK)
├── variant_id (FK → product_variants)
├── provider_id (FK → pod_providers)
├── provider_product_id (varchar) -- Provider's catalog product ID
├── provider_variant_id (varchar) -- Provider's variant ID
├── provider_sku (varchar, nullable)
├── base_cost (decimal) -- Cost from provider
├── special_finish (varchar, nullable) -- 'gold_foil', 'embossing', etc.
├── is_primary_provider (boolean) -- Use this provider for fulfillment
├── sync_status (enum: 'synced', 'pending', 'failed')
├── last_synced_at (timestamp)
├── created_at
```

### 2.6 Mockups with Workflow (Provider-Agnostic)

```sql
-- Product mockups from ANY POD provider
product_mockups
├── id (uuid, PK)
├── product_id (FK → products)
├── variant_id (FK → product_variants, nullable)
│
├── -- Provider references (generic) --
├── provider_id (FK → pod_providers) -- Which POD provider
├── provider_product_id (varchar) -- Provider's catalog product ID
├── provider_variant_id (varchar, nullable)
├── provider_task_id (varchar) -- Mockup generation task ID
│
├── -- Mockup metadata --
├── mockup_style (varchar) -- 'front', 'lifestyle', 'room_context', etc.
├── placement (varchar) -- 'front', 'back', 'sleeve', etc.
├── special_finish (varchar, nullable) -- 'gold_foil', 'silver_foil', etc.
├── original_url (text) -- Provider-hosted URL
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

### 2.7 AI Analysis

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

### 2.8 Mockup Generation Jobs (Multi-Provider)

```sql
-- Track async mockup generation across providers
mockup_generation_jobs
├── id (uuid, PK)
├── product_id (FK → products)
├── requested_by (FK → users)
│
├── -- Provider info --
├── provider_id (FK → pod_providers) -- Which provider to use
├── provider_task_id (varchar, nullable) -- Provider's job/task ID
│
├── -- Job configuration --
├── artwork_url (text)
├── requested_styles (jsonb) -- Array of style strings
├── requested_placements (jsonb) -- Array of placement strings
├── variant_ids (jsonb, nullable) -- Specific variants, or all
├── special_finish (varchar, nullable) -- 'gold_foil', etc.
│
├── -- Status tracking --
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

## 6. Multi-POD Mockup Generation

### 6.1 Provider-Specific Mockup Styles

**Printful Styles:**
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

**Gelato Styles:**
| Style | Description | Use Case |
|-------|-------------|----------|
| `front` | Standard front view | Default product shot |
| `lifestyle` | In room/context | Wall art showcase |
| `detail` | Close-up of finish | Show gold foil, texture |
| `room_context` | Multiple room settings | Interior visualization |
| `packaging` | With packaging | Gift presentation |

**Gelato Special Finishes:**
| Finish | Description | Products |
|--------|-------------|----------|
| `gold_foil` | Metallic gold accents | Prints, cards, invitations |
| `silver_foil` | Metallic silver accents | Prints, cards |
| `spot_uv` | Glossy raised areas | Business cards, covers |
| `embossing` | Raised texture | Cards, stationery |
| `fine_art` | Premium paper/canvas | Art prints, photos |

### 6.2 Generation Flow (Provider-Agnostic)

```
1. User uploads artwork
   └─→ Store in S3

2. User selects product + variants + styles + provider
   └─→ Determine provider from product catalog
   └─→ Check provider capabilities (gold foil? embroidery?)
   └─→ Create mockup_generation_job with provider_id

3. Submit to provider (abstracted)
   └─→ PrintfulProvider.generateMockups() OR
   └─→ GelatoProvider.generateMockups()
   └─→ Store provider_task_id

4. Poll for completion (or use webhook)
   └─→ Provider-specific polling/webhook handling
   └─→ Get mockup URLs

5. Store mockups
   └─→ Download to S3 (optional)
   └─→ Create product_mockups records with provider_id
   └─→ Set status: pending_ai_review

6. Trigger AI analysis
   └─→ Queue batch analysis job
   └─→ AI considers special finishes in evaluation
```

### 6.3 Provider Factory Pattern

```typescript
// Get the right provider implementation
function getProvider(providerSlug: string): PODProvider {
  switch (providerSlug) {
    case 'printful':
      return new PrintfulProvider(env.PRINTFUL_API_KEY);
    case 'gelato':
      return new GelatoProvider(env.GELATO_API_KEY);
    default:
      throw new Error(`Unknown provider: ${providerSlug}`);
  }
}

// Usage in mockup generation
async function generateMockups(jobId: string) {
  const job = await getJob(jobId);
  const provider = getProvider(job.providerSlug);

  const result = await provider.generateMockups({
    productId: job.providerProductId,
    artworkUrl: job.artworkUrl,
    styles: job.requestedStyles,
    specialFinish: job.specialFinish, // 'gold_foil' for Gelato
  });

  return result;
}
```

### 6.4 API Endpoints Needed

```typescript
// New tRPC procedures in admin-products router

// Generate mockups for a product (provider-aware)
generateMockups: adminProcedure
  .input(z.object({
    productId: z.number(),
    artworkUrl: z.string().url(),
    styles: z.array(z.string()), // Provider-specific styles
    variantIds: z.array(z.number()).optional(),
    providerId: z.number().optional(), // Use specific provider
    specialFinish: z.string().optional(), // 'gold_foil', etc.
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
| **Printful API** | Apparel mockups & fulfillment | Existing integration |
| **Gelato API** | Premium prints, gold foil, fine art | New integration needed |
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

# POD Providers
PRINTFUL_API_KEY="..."
PRINTFUL_WEBHOOK_SECRET="..."
GELATO_API_KEY="..."
GELATO_WEBHOOK_SECRET="..."
# Future providers
# GOOTEN_API_KEY="..."
# SPOD_API_KEY="..."

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
│   │   │   ├── products.ts       # MODIFY: Add ownership, provider links
│   │   │   ├── mockups.ts        # NEW: Mockups, analyses, jobs
│   │   │   ├── pod-providers.ts  # NEW: Provider registry & credentials
│   │   │   ├── orders.ts
│   │   │   └── cms.ts
│   │   └── index.ts
│   │
│   ├── api/
│   │   ├── routers/
│   │   │   ├── admin-products.ts # MODIFY: Add mockup procedures
│   │   │   ├── admin-mockups.ts  # NEW: Mockup management
│   │   │   ├── admin-providers.ts # NEW: POD provider management
│   │   │   ├── admin-users.ts    # NEW: User management (Phase 4)
│   │   │   └── ...
│   │   ├── trpc.ts
│   │   └── root.ts
│   │
│   ├── pod/                       # NEW: Multi-provider abstraction
│   │   ├── types.ts              # Shared interfaces
│   │   ├── provider-factory.ts   # Get provider by slug
│   │   ├── providers/
│   │   │   ├── printful.ts       # Printful implementation
│   │   │   ├── gelato.ts         # Gelato implementation
│   │   │   └── index.ts          # Export all providers
│   │   └── mockup-generator.ts   # Provider-agnostic generation
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
│       └── poll-provider.ts      # Generic provider polling
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

## 11. Future POD Providers Roadmap

### 11.1 Planned Providers

| Provider | Priority | Unique Value | Target Products | Est. Integration |
|----------|----------|--------------|-----------------|------------------|
| **Gooten** | High | Large catalog, competitive pricing | Home goods, phone cases, jewelry | Phase 2 |
| **SPOD** | High | Fast EU fulfillment, Spreadshirt network | European apparel market | Phase 2 |
| **Prodigi** | Medium | Fine art, global fulfillment | Art prints, photo products | Phase 3 |
| **CustomCat** | Medium | US-based, fast shipping | Apparel, drinkware | Phase 3 |
| **Awkward Styles** | Low | Niche apparel, all-over prints | Custom fashion | Phase 4 |
| **Printed Mint** | Low | Stationery, invitations | Wedding, events | Phase 4 |

### 11.2 Provider Details

#### Gooten
```typescript
{
  slug: 'gooten',
  name: 'Gooten',
  apiBaseUrl: 'https://api.gooten.com/v1',
  capabilities: {
    mockupGeneration: true,
    mockupStyles: ['front', 'back', 'lifestyle', 'flat'],
    specialFinishes: [],
    productCategories: ['apparel', 'home_decor', 'accessories', 'phone_cases', 'jewelry'],
    webhookSupport: true,
    apiVersion: 'v1',
  },
  notes: [
    'Large product catalog (300+ products)',
    'Competitive wholesale pricing',
    'Good for home goods and accessories',
    'API uses different auth model (API key + recipe ID)',
  ],
  apiDocs: 'https://www.gooten.com/api-docs',
}
```

#### SPOD (Spreadshirt Print-On-Demand)
```typescript
{
  slug: 'spod',
  name: 'SPOD',
  apiBaseUrl: 'https://api.spod.com/v1',
  capabilities: {
    mockupGeneration: true,
    mockupStyles: ['front', 'back', 'detail', 'lifestyle'],
    specialFinishes: ['flex', 'flock', 'digital_direct'],
    productCategories: ['apparel', 'accessories'],
    webhookSupport: true,
    apiVersion: 'v1',
  },
  notes: [
    'Part of Spreadshirt network',
    'Strong EU fulfillment (Germany-based)',
    '48-hour production guarantee',
    'Good for European customers',
  ],
  apiDocs: 'https://spod.com/api-documentation',
}
```

#### Prodigi
```typescript
{
  slug: 'prodigi',
  name: 'Prodigi',
  apiBaseUrl: 'https://api.prodigi.com/v4.0',
  capabilities: {
    mockupGeneration: true,
    mockupStyles: ['product', 'lifestyle', 'detail'],
    specialFinishes: ['giclée', 'metallic', 'canvas_wrap'],
    productCategories: ['prints', 'canvas', 'framed', 'photo_products', 'apparel'],
    webhookSupport: true,
    apiVersion: 'v4.0',
  },
  notes: [
    'Premium fine art printing',
    'Global fulfillment network',
    'Museum-quality prints',
    'Good for art and photography',
  ],
  apiDocs: 'https://www.prodigi.com/print-api/docs/',
}
```

#### CustomCat
```typescript
{
  slug: 'customcat',
  name: 'CustomCat',
  apiBaseUrl: 'https://api.customcat.com/v1',
  capabilities: {
    mockupGeneration: true,
    mockupStyles: ['front', 'back', 'mockup'],
    specialFinishes: ['dtg', 'sublimation', 'embroidery'],
    productCategories: ['apparel', 'drinkware', 'accessories'],
    webhookSupport: true,
    apiVersion: 'v1',
  },
  notes: [
    'US-based fulfillment only',
    'Fast 2-3 day production',
    'Good for US market',
    'Competitive apparel pricing',
  ],
  apiDocs: 'https://customcat.com/api-documentation',
}
```

### 11.3 Integration Priority Matrix

| Factor | Printful | Gelato | Gooten | SPOD | Prodigi |
|--------|----------|--------|--------|------|---------|
| Product variety | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Premium finishes | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| US fulfillment | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| EU fulfillment | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| API quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Mockup quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Pricing | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### 11.4 Provider Selection Logic (Future)

```typescript
// Auto-select best provider based on criteria
async function selectOptimalProvider(options: {
  productCategory: string;
  specialFinish?: string;
  customerRegion: string;
  prioritize: 'cost' | 'speed' | 'quality';
}): Promise<PODProvider> {
  const candidates = await getProvidersForCategory(options.productCategory);

  // Filter by special finish requirement
  if (options.specialFinish) {
    candidates = candidates.filter(p =>
      p.capabilities.specialFinishes.includes(options.specialFinish)
    );
  }

  // Score by region fulfillment
  const scored = candidates.map(p => ({
    provider: p,
    score: calculateProviderScore(p, options),
  }));

  // Return best match
  return scored.sort((a, b) => b.score - a.score)[0].provider;
}
```

---

## 12. Adding New POD Providers

### 12.1 Steps to Add a New Provider

1. **Research the provider's API**
   - Authentication method
   - Catalog endpoints
   - Mockup generation endpoints
   - Webhook support

2. **Add provider to registry**
   ```sql
   INSERT INTO pod_providers (slug, name, api_base_url, capabilities)
   VALUES ('newprovider', 'New Provider', 'https://api.newprovider.com', '{...}');
   ```

3. **Implement the provider interface**
   ```typescript
   // src/server/pod/providers/newprovider.ts
   export class NewProvider implements PODProvider {
     // Implement all interface methods
   }
   ```

4. **Register in factory**
   ```typescript
   // src/server/pod/provider-factory.ts
   case 'newprovider':
     return new NewProvider(env.NEWPROVIDER_API_KEY);
   ```

5. **Add environment variables**
   ```bash
   NEWPROVIDER_API_KEY="..."
   NEWPROVIDER_WEBHOOK_SECRET="..."
   ```

6. **Create webhook handler** (if supported)

### 12.2 Provider Capability Flags

When adding a provider, document its capabilities:

```typescript
{
  mockupGeneration: true,
  mockupStyles: ['front', 'back', 'lifestyle'],
  specialFinishes: ['embroidery', 'dtg'],
  productCategories: ['apparel'],
  webhookSupport: true,
  asyncMockups: true,  // Requires polling
  bulkOperations: true,
  apiRateLimit: 100,   // Requests per minute
}
```

---

## 13. Open Questions

1. **Authentication**: Use NextAuth.js, Clerk, or custom auth?
2. **Age verification**: How to verify DOB for COPPA compliance?
3. **Guardian verification**: How to verify guardian relationships?
4. **Moderation**: Should AI also check for inappropriate content?
5. **Pricing**: Should mockup generation have usage limits?
6. **Provider failover**: If Printful is down, auto-switch to Gelato for similar products?
7. **Cost optimization**: Auto-select cheapest provider for fulfillment?

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| AI analysis accuracy (human agreement rate) | > 85% |
| Mockup generation success rate (all providers) | > 95% |
| Average review queue processing time | < 24 hours |
| Human override rate on AI approvals | < 15% |
| Human override rate on AI rejections | < 25% |
| Provider API uptime | > 99.5% |
| Cross-provider fulfillment success | > 98% |
