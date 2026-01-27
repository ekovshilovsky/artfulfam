import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  printfulFiles,
  printfulSyncProducts,
  productDrafts,
  productImages,
  productVariants,
  products,
} from "@/server/db/schema";
import { printfulRequest } from "@/server/printful/client";
import { buildSpacesPublicUrl, createSpacesUploadUrl } from "@/server/storage/spaces";

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const slugify = (value: string, fallback = "product") => {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || fallback;
};

const parseVariantSizeColor = (variant: {
  size?: string | null;
  color?: string | null;
  name?: string | null;
}) => {
  if (variant.size || variant.color) {
    return {
      size: variant.size || "One Size",
      color: variant.color || "Default",
    };
  }

  if (variant.name) {
    const parts = variant.name.split(" / ").map((part) => part.trim());
    if (parts.length >= 2) {
      return {
        size: parts[0] || "One Size",
        color: parts[1] || "Default",
      };
    }
  }

  return { size: "One Size", color: "Default" };
};

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

  saveDraftProduct: adminProcedure
    .input(
      z.object({
        product: z.object({
          id: z.number().int().optional(),
          slug: z.string().min(1),
          title: z.string().min(1),
          description: z.string().optional(),
          thumbnailUrl: z.string().url().optional(),
          status: z.enum(["draft", "published", "archived"]).default("draft"),
        }),
        variants: z
          .array(
            z.object({
              id: z.number().int().optional(),
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
      return ctx.db.transaction(async (tx) => {
        let productId = input.product.id ?? null;

        if (productId) {
          await tx
            .update(products)
            .set({
              slug: input.product.slug,
              title: input.product.title,
              description: input.product.description ?? null,
              thumbnailUrl: input.product.thumbnailUrl ?? null,
              status: input.product.status,
            })
            .where(eq(products.id, productId));
        } else {
          const [product] = await tx
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
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }

          productId = product.id;
        }

        const updatedVariants: Array<{ id: number; printfulVariantId: number }> = [];

        for (const variant of input.variants) {
          if (variant.id) {
            await tx
              .update(productVariants)
              .set({
                size: variant.size,
                color: variant.color,
                sku: variant.sku ?? null,
                retailPrice: variant.retailPrice,
                currency: variant.currency,
                availabilityStatus: variant.availabilityStatus,
                printfulVariantId: variant.printfulVariantId,
              })
              .where(eq(productVariants.id, variant.id));

            updatedVariants.push({
              id: variant.id,
              printfulVariantId: variant.printfulVariantId,
            });
          } else {
            const [createdVariant] = await tx
              .insert(productVariants)
              .values({
                productId,
                size: variant.size,
                color: variant.color,
                sku: variant.sku ?? null,
                retailPrice: variant.retailPrice,
                currency: variant.currency,
                availabilityStatus: variant.availabilityStatus,
                printfulVariantId: variant.printfulVariantId,
              })
              .returning({
                id: productVariants.id,
                printfulVariantId: productVariants.printfulVariantId,
              });

            if (createdVariant) {
              updatedVariants.push(createdVariant);
            }
          }
        }

        if (productId) {
          const currentVariants = await tx
            .select({ id: productVariants.id })
            .from(productVariants)
            .where(eq(productVariants.productId, productId));

          const keepVariantIds = new Set(
            input.variants.map((variant) => variant.id).filter(Boolean),
          );

          const toDelete = currentVariants
            .map((variant) => variant.id)
            .filter((id) => !keepVariantIds.has(id));

          if (toDelete.length) {
            await tx
              .delete(productVariants)
              .where(inArray(productVariants.id, toDelete));
          }
        }

        if (input.images) {
          await tx.delete(productImages).where(eq(productImages.productId, productId));

          if (input.images.length) {
            await tx.insert(productImages).values(
              input.images.map((url, index) => ({
                productId,
                url,
                sortOrder: index,
              })),
            );
          }
        }

        return { ok: true, productId, variants: updatedVariants };
      });
    }),

  listCatalogProducts: adminProcedure
    .input(
      z
        .object({
          offset: z.number().int().min(0).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          categoryIds: z.array(z.number().int()).optional(),
          search: z.string().min(1).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const offset = input?.offset ?? 0;
      const limit = input?.limit ?? 20;
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });

      if (input?.categoryIds?.length) {
        params.set("category_id", input.categoryIds.join(","));
      }

      if (input?.search) {
        params.set("search", input.search);
      }

      return printfulRequest(`/products?${params.toString()}`);
    }),

  listCatalogCategories: adminProcedure.query(async () => {
    return printfulRequest("/categories");
  }),

  getCatalogProduct: adminProcedure
    .input(z.object({ productId: z.number().int() }))
    .query(async ({ input }) => {
      return printfulRequest(`/products/${input.productId}`);
    }),

  createDraftFromCatalog: adminProcedure
    .input(
      z.object({
        catalogProductId: z.number().int(),
        variantIds: z.array(z.number().int()).optional(),
        retailPrice: z.string().min(1).optional(),
        currency: z.string().length(3).default("USD"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const catalogProduct = await printfulRequest<{
        product: {
          id: number;
          name?: string | null;
          model?: string | null;
          description?: string | null;
          image?: string | null;
          thumbnail_url?: string | null;
        };
        variants: Array<{
          id: number;
          name?: string | null;
          size?: string | null;
          color?: string | null;
          price?: string | number | null;
        }>;
      }>(`/products/${input.catalogProductId}`);

      const variants = input.variantIds?.length
        ? catalogProduct.variants.filter((variant) => input.variantIds?.includes(variant.id))
        : catalogProduct.variants;

      if (!variants.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No variants selected." });
      }

      const productName = catalogProduct.product.model || catalogProduct.product.name || "Catalog";
      const slugBase = `${slugify(productName)}-${catalogProduct.product.id}`;

      return ctx.db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            slug: slugBase,
            title: productName,
            description: catalogProduct.product.description ?? null,
            thumbnailUrl:
              catalogProduct.product.thumbnail_url ??
              catalogProduct.product.image ??
              null,
            status: "draft",
          })
          .returning({ id: products.id });

        if (!product) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        await tx.insert(productVariants).values(
          variants.map((variant) => {
            const parsed = parseVariantSizeColor(variant);
            const basePrice =
              input.retailPrice ??
              (typeof variant.price === "string" ? variant.price : null) ??
              (typeof variant.price === "number" ? variant.price.toFixed(2) : null) ??
              "0.00";

            return {
              productId: product.id,
              size: parsed.size,
              color: parsed.color,
              sku: null,
              retailPrice: basePrice,
              currency: input.currency,
              availabilityStatus: "active",
              printfulVariantId: variant.id,
            };
          }),
        );

        const images = [
          catalogProduct.product.thumbnail_url,
          catalogProduct.product.image,
        ].filter((url): url is string => !!url);

        if (images.length) {
          await tx.insert(productImages).values(
            images.map((url, index) => ({
              productId: product.id,
              url,
              sortOrder: index,
            })),
          );
        }

        return { ok: true, productId: product.id };
      });
    }),

  getVariantPrintfiles: adminProcedure
    .input(z.object({ variantId: z.number().int() }))
    .query(async ({ input }) => {
      return printfulRequest(`/mockup-generator/printfiles/${input.variantId}`);
    }),

  createPrintfileUpload: adminProcedure
    .input(
      z.object({
        variantId: z.number().int(),
        placementType: z.string().min(1),
        fileName: z.string().min(1),
        contentType: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const safeName = sanitizeFileName(input.fileName);
      const key = `printfiles/${input.variantId}/${crypto.randomUUID()}-${safeName}`;
      const publicUrl = buildSpacesPublicUrl(key);
      const uploadUrl = await createSpacesUploadUrl({
        key,
        contentType: input.contentType,
      });

      const [file] = await ctx.db
        .insert(printfulFiles)
        .values({
          productVariantId: input.variantId,
          placementType: input.placementType,
          fileUrl: publicUrl,
          status: "uploading",
        })
        .returning({ id: printfulFiles.id });

      if (!file) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return {
        fileId: file.id,
        uploadUrl,
        publicUrl,
      };
    }),

  markPrintfileUploaded: adminProcedure
    .input(z.object({ fileId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(printfulFiles)
        .set({ status: "pending" })
        .where(eq(printfulFiles.id, input.fileId));

      return { ok: true };
    }),

  syncToPrintful: adminProcedure
    .input(z.object({ productId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(eq(products.id, input.productId));

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      }

      const existingSync = await ctx.db
        .select()
        .from(printfulSyncProducts)
        .where(eq(printfulSyncProducts.productId, input.productId));

      if (existingSync.some((row) => row.status === "synced")) {
        throw new TRPCError({ code: "CONFLICT", message: "Product already synced." });
      }

      const variants = await ctx.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, input.productId));

      if (!variants.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No variants to sync." });
      }

      const files = await ctx.db
        .select()
        .from(printfulFiles)
        .where(
          and(
            inArray(
              printfulFiles.productVariantId,
              variants.map((variant) => variant.id),
            ),
            eq(printfulFiles.status, "pending"),
          ),
        );

      const filesByVariant = new Map<number, typeof files>();
      for (const file of files) {
        const existing = filesByVariant.get(file.productVariantId) ?? [];
        existing.push(file);
        filesByVariant.set(file.productVariantId, existing);
      }

      for (const variant of variants) {
        if (!filesByVariant.get(variant.id)?.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Missing print files for variant ${variant.id}.`,
          });
        }
      }

      try {
        const payload = {
          sync_product: {
            name: product.title,
            external_id: `product-${product.id}`,
            thumbnail: product.thumbnailUrl ?? files[0]?.fileUrl ?? undefined,
          },
          sync_variants: variants.map((variant) => ({
            external_id: `variant-${variant.id}`,
            variant_id: variant.printfulVariantId,
            retail_price: variant.retailPrice,
            files: (filesByVariant.get(variant.id) ?? []).map((file) => ({
              type: file.placementType,
              url: file.fileUrl,
            })),
          })),
        };

        const result = await printfulRequest<{
          id: number;
          external_id: string | null;
          sync_variants: Array<{
            id: number;
            external_id: string | null;
            variant_id: number;
          }>;
        }>("/store/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const [syncProduct] = await ctx.db
          .insert(printfulSyncProducts)
          .values({
            productId: product.id,
            printfulSyncProductId: result.id,
            printfulExternalProductId: result.external_id ?? payload.sync_product.external_id,
            status: "synced",
            syncedAt: new Date(),
            lastError: null,
          })
          .returning({ id: printfulSyncProducts.id });

        const syncVariantsByExternalId = new Map(
          result.sync_variants.map((variant) => [variant.external_id, variant]),
        );

        for (const variant of variants) {
          const syncVariant = syncVariantsByExternalId.get(`variant-${variant.id}`);
          if (!syncVariant) {
            continue;
          }

          await ctx.db
            .update(productVariants)
            .set({
              printfulSyncVariantId: syncVariant.id,
              printfulExternalVariantId: syncVariant.external_id ?? `variant-${variant.id}`,
            })
            .where(eq(productVariants.id, variant.id));
        }

        await ctx.db
          .update(printfulFiles)
          .set({ status: "synced" })
          .where(
            and(
              inArray(
                printfulFiles.productVariantId,
                variants.map((variant) => variant.id),
              ),
              eq(printfulFiles.status, "pending"),
            ),
          );

        return {
          ok: true,
          printfulSyncProductId: result.id,
          syncRecordId: syncProduct?.id ?? null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await ctx.db
          .insert(printfulSyncProducts)
          .values({
            productId: product.id,
            printfulSyncProductId: null,
            status: "failed",
            lastError: message,
            syncedAt: new Date(),
          })
          .onConflictDoNothing();

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  getSyncStatus: adminProcedure
    .input(z.object({ productId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(eq(products.id, input.productId));

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      }

      const [syncRecord] = await ctx.db
        .select()
        .from(printfulSyncProducts)
        .where(eq(printfulSyncProducts.productId, input.productId))
        .orderBy(desc(printfulSyncProducts.id))
        .limit(1);

      const images = await ctx.db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, input.productId))
        .orderBy(desc(productImages.id));

      const variants = await ctx.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, input.productId));

      const variantIds = variants.map((variant) => variant.id);
      const files = variantIds.length
        ? await ctx.db
            .select()
            .from(printfulFiles)
            .where(inArray(printfulFiles.productVariantId, variantIds))
        : [];

      const filesByVariant = new Map<number, typeof files>();
      for (const file of files) {
        const existing = filesByVariant.get(file.productVariantId) ?? [];
        existing.push(file);
        filesByVariant.set(file.productVariantId, existing);
      }

      return {
        product,
        images,
        sync: syncRecord ?? null,
        variants: variants.map((variant) => ({
          ...variant,
          files: filesByVariant.get(variant.id) ?? [],
        })),
      };
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

  listProducts: adminProcedure
    .input(z.object({ status: z.enum(["draft", "published", "archived"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const baseQuery = ctx.db.select().from(products);
      const withFilter = input?.status
        ? baseQuery.where(eq(products.status, input.status))
        : baseQuery;
      return withFilter.orderBy(desc(products.createdAt));
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
