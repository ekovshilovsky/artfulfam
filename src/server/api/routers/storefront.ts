import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { products } from "@/server/db/schema";

export const storefrontRouter = createTRPCRouter({
  listPublishedProducts: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(products)
      .where(eq(products.status, "published"));
  }),

  getProductBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(eq(products.slug, input.slug));

      return product ?? null;
    }),
});
