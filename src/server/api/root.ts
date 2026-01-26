import { adminProductsRouter } from "@/server/api/routers/admin-products";
import { ordersRouter } from "@/server/api/routers/orders";
import { postRouter } from "@/server/api/routers/post";
import { storefrontRouter } from "@/server/api/routers/storefront";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  adminProducts: adminProductsRouter,
  orders: ordersRouter,
  post: postRouter,
  storefront: storefrontRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
