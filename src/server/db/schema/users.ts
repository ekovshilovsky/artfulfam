/**
 * Users & Roles Schema
 *
 * Comprehensive user system supporting:
 * - Age-based categories (child, teen, adult)
 * - Multiple roles (admin, parent, guardian, artist, teacher, student, buyer)
 * - Guardian-child relationships
 * - Teacher-student relationships via classes
 * - Organizations (families, schools, teams)
 */

import { index, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable } from "@/server/db/schema/base";

// ============================================================================
// Users
// ============================================================================

/**
 * Core users table
 */
export const users = createTable(
  "user",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    email: d.varchar({ length: 255 }).notNull(),
    passwordHash: d.text(),
    displayName: d.varchar({ length: 128 }).notNull(),
    avatarUrl: d.text(),
    dateOfBirth: d.date(),
    /** Computed from dateOfBirth: 'child' (<13), 'teen' (13-17), 'adult' (18+) */
    ageCategory: d
      .varchar({ length: 16 })
      .$type<"child" | "teen" | "adult">()
      .notNull()
      .default("adult"),
    accountStatus: d
      .varchar({ length: 32 })
      .$type<"pending" | "active" | "suspended" | "deleted">()
      .notNull()
      .default("pending"),
    emailVerifiedAt: d.timestamp({ withTimezone: true }),
    lastLoginAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("user_email_unique").on(t.email),
    index("user_age_category_idx").on(t.ageCategory),
    index("user_status_idx").on(t.accountStatus),
  ]
);

// ============================================================================
// Roles
// ============================================================================

/**
 * User roles (a user can have multiple roles)
 *
 * Roles:
 * - admin: Platform administrators
 * - parent: Adults managing children's accounts
 * - guardian: Legal guardians (same as parent, different relationship type)
 * - artist: Adult creators (18+)
 * - teacher: Educators managing student work
 * - student: Children linked to teachers
 * - buyer: Family members/customers
 */
export const userRoles = createTable(
  "user_role",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: d
      .varchar({ length: 32 })
      .$type<
        "admin" | "parent" | "guardian" | "artist" | "teacher" | "student" | "buyer"
      >()
      .notNull(),
    /** Optional organization context for the role */
    organizationId: d.integer().references(() => organizations.id, {
      onDelete: "set null",
    }),
    /** Who granted this role */
    grantedBy: d.uuid().references(() => users.id, { onDelete: "set null" }),
    grantedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    /** Soft revocation - null means active */
    revokedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("user_role_user_idx").on(t.userId),
    index("user_role_role_idx").on(t.role),
    uniqueIndex("user_role_unique").on(t.userId, t.role, t.organizationId),
  ]
);

// ============================================================================
// Guardian Relationships
// ============================================================================

/**
 * Guardian-child relationships
 *
 * Links adults to children they manage (for COPPA compliance)
 */
export const guardianRelationships = createTable(
  "guardian_relationship",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    /** Must be an adult user */
    guardianId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Must be under 18 */
    childId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    relationshipType: d
      .varchar({ length: 32 })
      .$type<"parent" | "legal_guardian" | "authorized_adult">()
      .notNull()
      .default("parent"),
    /** Primary guardian receives notifications and has final approval */
    isPrimary: d.boolean().notNull().default(false),
    /** Granular permissions (JSON) */
    permissions: d.jsonb().$type<{
      canApproveContent?: boolean;
      canManagePayouts?: boolean;
      canViewActivity?: boolean;
    }>(),
    /** Identity verification timestamp */
    verifiedAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("guardian_rel_guardian_idx").on(t.guardianId),
    index("guardian_rel_child_idx").on(t.childId),
    uniqueIndex("guardian_rel_unique").on(t.guardianId, t.childId),
  ]
);

// ============================================================================
// Organizations
// ============================================================================

/**
 * Organizations (families, schools, teams, studios)
 */
export const organizations = createTable(
  "organization",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 128 }).notNull(),
    type: d
      .varchar({ length: 32 })
      .$type<"family" | "school" | "team" | "studio">()
      .notNull(),
    /** Organization owner */
    ownerId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Organization-wide settings */
    settings: d.jsonb().$type<{
      defaultRevenueShare?: number;
      requireApprovalForPublish?: boolean;
      allowedProductCategories?: string[];
    }>(),
    /** Stripe Connect account for organization payouts */
    stripeConnectAccountId: d.varchar({ length: 128 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("organization_owner_idx").on(t.ownerId),
    index("organization_type_idx").on(t.type),
  ]
);

// ============================================================================
// Classes (for Teachers)
// ============================================================================

/**
 * Classes - groups students under a teacher
 */
export const classes = createTable(
  "class",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    teacherId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Optional school organization */
    organizationId: d.integer().references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: d.varchar({ length: 128 }).notNull(),
    description: d.text(),
    gradeLevel: d.varchar({ length: 32 }),
    schoolYear: d.varchar({ length: 16 }),
    isActive: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("class_teacher_idx").on(t.teacherId),
    index("class_org_idx").on(t.organizationId),
    index("class_active_idx").on(t.isActive),
  ]
);

/**
 * Class enrollments - links students to classes
 */
export const classEnrollments = createTable(
  "class_enrollment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    classId: d
      .integer()
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    /** Soft removal */
    removedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("class_enrollment_class_idx").on(t.classId),
    index("class_enrollment_student_idx").on(t.studentId),
    uniqueIndex("class_enrollment_unique").on(t.classId, t.studentId),
  ]
);

// ============================================================================
// Stripe Connect
// ============================================================================

/**
 * Stripe Connect accounts for creator payouts
 */
export const stripeConnectAccounts = createTable(
  "stripe_connect_account",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeAccountId: d.varchar({ length: 128 }).notNull(),
    accountType: d
      .varchar({ length: 32 })
      .$type<"express" | "standard" | "custom">()
      .notNull()
      .default("express"),
    chargesEnabled: d.boolean().notNull().default(false),
    payoutsEnabled: d.boolean().notNull().default(false),
    onboardingComplete: d.boolean().notNull().default(false),
    defaultCurrency: d.varchar({ length: 3 }).default("USD"),
    country: d.varchar({ length: 2 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("stripe_connect_user_unique").on(t.userId),
    uniqueIndex("stripe_connect_account_unique").on(t.stripeAccountId),
  ]
);
