import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { productDrafts, productImages, productVariants, products } from "@/server/db/schema";

export const adminProductsRouter = createTRPCRouter({
  createDraft: adminProcedure
    .input(
      z.object({
        productId: z.number().int().optional(),
        draftData: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [draft] = await ctx.db
        .insert(productDrafts)
        .values({
          productId: input.productId ?? null,
          draftData: input.draftData,
        })
        .returning({ id: productDrafts.id });

      return { draftId: draft?.id };
    }),

  updateDraft: adminProcedure
    .input(
      z.object({
        draftId: z.number().int(),
        draftData: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(productDrafts)
        .set({ draftData: input.draftData })
        .where(eq(productDrafts.id, input.draftId));

      return { ok: true };
    }),

  listDrafts: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(productDrafts)
        .orderBy(desc(productDrafts.createdAt))
        .limit(input?.limit ?? 50);
    }),

  publishProduct: adminProcedure
    .input(
      z.object({
        product: z.object({
          slug: z.string().min(1),
          title: z.string().min(1),
          description: z.string().optional(),
          thumbnailUrl: z.string().url().optional(),
          status: z.enum(["draft", "published", "archived"]).default("published"),
        }),
        variants: z
          .array(
            z.object({
              size: z.string().min(1),
              color: z.string().min(1),
              sku: z.string().optional(),
              retailPrice: z.string().min(1),
              currency: z.string().length(3).default("USD"),
              availabilityStatus: z
                .enum(["active", "discontinued", "out_of_stock", "temporary_out_of_stock"])
                .default("active"),
              printfulVariantId: z.number().int(),
            }),
          )
          .min(1),
        images: z.array(z.string().url()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .insert(products)
        .values({
          slug: input.product.slug,
          title: input.product.title,
          description: input.product.description ?? null,
          thumbnailUrl: input.product.thumbnailUrl ?? null,
          status: input.product.status,
        })
        .returning({ id: products.id });

      if (!product) {
        return { ok: false };
      }

      await ctx.db.insert(productVariants).values(
        input.variants.map((variant) => ({
          productId: product.id,
          size: variant.size,
          color: variant.color,
          sku: variant.sku ?? null,
          retailPrice: variant.retailPrice,
          currency: variant.currency,
          availabilityStatus: variant.availabilityStatus,
          printfulVariantId: variant.printfulVariantId,
        })),
      );

      if (input.images?.length) {
        await ctx.db.insert(productImages).values(
          input.images.map((url, index) => ({
            productId: product.id,
            url,
            sortOrder: index,
          })),
        );
      }

      return { ok: true, productId: product.id };
    }),

  listProducts: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(products).orderBy(desc(products.createdAt));
  }),

  updateVariantPricing: adminProcedure
    .input(
      z.object({
        variantId: z.number().int(),
        retailPrice: z.string().min(1),
        currency: z.string().length(3).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(productVariants)
        .set({
          retailPrice: input.retailPrice,
          currency: input.currency ?? "USD",
        })
        .where(eq(productVariants.id, input.variantId));

      return { ok: true };
    }),
});
