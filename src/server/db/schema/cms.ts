import { index } from "drizzle-orm/pg-core";

import { createTable } from "@/server/db/schema/base";
import { products } from "@/server/db/schema/product";

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

export const productDrafts = createTable(
  "product_draft",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    productId: d.integer().references(() => products.id, {
      onDelete: "set null",
    }),
    draftData: d.jsonb().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [index("product_draft_product_idx").on(t.productId)],
);
