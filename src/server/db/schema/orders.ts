import { index, numeric, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "@/server/db/schema/base";
import { productVariants } from "@/server/db/schema/product";

export const orders = createTable(
  "order",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    status: d.varchar({ length: 32 }).notNull().default("pending"),
    stripeSessionId: d.varchar({ length: 255 }),
    printfulOrderId: d.integer(),
    printfulExternalOrderId: d.varchar({ length: 128 }),
    email: d.varchar({ length: 256 }),
    shippingAddress: d.jsonb(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("order_status_idx").on(t.status),
    uniqueIndex("order_stripe_session_unique").on(t.stripeSessionId),
  ],
);

export const orderItems = createTable(
  "order_item",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    orderId: d
      .integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productVariantId: d
      .integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: d.integer().notNull().default(1),
    unitPrice: d.numeric({ precision: 10, scale: 2 }).notNull(),
    currency: d.varchar({ length: 3 }).notNull().default("USD"),
  }),
  (t) => [index("order_item_order_idx").on(t.orderId)],
);
