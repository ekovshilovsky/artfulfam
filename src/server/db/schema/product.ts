import { index, numeric, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "@/server/db/schema/base";

export const products = createTable(
  "product",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    slug: d.varchar({ length: 256 }).notNull(),
    title: d.varchar({ length: 256 }).notNull(),
    description: d.text(),
    status: d.varchar({ length: 32 }).notNull().default("draft"),
    thumbnailUrl: d.text(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("product_slug_unique").on(t.slug),
    index("product_status_idx").on(t.status),
  ],
);

export const productVariants = createTable(
  "product_variant",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    productId: d
      .integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: d.varchar({ length: 32 }).notNull(),
    color: d.varchar({ length: 64 }).notNull(),
    sku: d.varchar({ length: 128 }),
    retailPrice: d.numeric({ precision: 10, scale: 2 }).notNull(),
    currency: d.varchar({ length: 3 }).notNull().default("USD"),
    availabilityStatus: d.varchar({ length: 32 }).notNull().default("active"),
    printfulVariantId: d.integer().notNull(),
    printfulSyncVariantId: d.integer(),
    printfulExternalVariantId: d.varchar({ length: 128 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("product_variant_product_idx").on(t.productId),
    index("product_variant_printful_variant_idx").on(t.printfulVariantId),
    index("product_variant_status_idx").on(t.availabilityStatus),
  ],
);

export const productImages = createTable(
  "product_image",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    productId: d
      .integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: d.text().notNull(),
    sortOrder: d.integer().notNull().default(0),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [index("product_image_product_idx").on(t.productId)],
);
