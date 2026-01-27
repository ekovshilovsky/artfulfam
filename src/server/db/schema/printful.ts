import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "@/server/db/schema/base";
import { productVariants, products } from "@/server/db/schema/product";

export const printfulSyncProducts = createTable(
  "printful_sync_product",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    productId: d
      .integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    printfulSyncProductId: d.integer(),
    printfulExternalProductId: d.varchar({ length: 128 }),
    status: d.varchar({ length: 32 }).notNull().default("synced"),
    lastError: d.text(),
    syncedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    uniqueIndex("printful_sync_product_unique").on(t.printfulSyncProductId),
    index("printful_sync_product_product_idx").on(t.productId),
  ],
);

export const printfulFiles = createTable(
  "printful_file",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    productVariantId: d
      .integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    placementType: d.varchar({ length: 64 }).notNull(),
    fileUrl: d.text().notNull(),
    fileHash: d.varchar({ length: 128 }),
    printfulFileId: d.integer(),
    status: d.varchar({ length: 32 }).notNull().default("pending"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [
    index("printful_file_variant_idx").on(t.productVariantId),
    index("printful_file_placement_idx").on(t.placementType),
  ],
);
