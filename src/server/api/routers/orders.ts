import { z } from "zod";
import { inArray } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { orderItems, orders, productVariants } from "@/server/db/schema";

export const ordersRouter = createTRPCRouter({
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        items: z
          .array(
            z.object({
              variantId: z.number().int(),
              quantity: z.number().int().min(1),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .insert(orders)
        .values({
          status: "pending",
          email: input.email,
        })
        .returning({ id: orders.id });

      if (!order) {
        return { ok: false };
      }

      const variantIds = input.items.map((item) => item.variantId);
      const variants = await ctx.db
        .select({
          id: productVariants.id,
          retailPrice: productVariants.retailPrice,
          currency: productVariants.currency,
        })
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds));

      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

      await ctx.db.insert(orderItems).values(
        input.items.map((item) => {
          const variant = variantMap.get(item.variantId);

          return {
            orderId: order.id,
            productVariantId: item.variantId,
            quantity: item.quantity,
            unitPrice: variant?.retailPrice ?? "0",
            currency: variant?.currency ?? "USD",
          };
        }),
      );

      return { ok: true, orderId: order.id, checkoutSessionId: null };
    }),

  createOrderFromStripe: publicProcedure
    .input(
      z.object({
        stripeSessionId: z.string().min(1),
        email: z.string().email().optional(),
        shippingAddress: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .insert(orders)
        .values({
          status: "paid",
          stripeSessionId: input.stripeSessionId,
          email: input.email ?? null,
          shippingAddress: input.shippingAddress ?? null,
        })
        .returning({ id: orders.id });

      return { ok: !!order, orderId: order?.id };
    }),
});
