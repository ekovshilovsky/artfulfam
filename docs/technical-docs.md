# Technical docs

## Schema design

Split schema across files and re-export from `src/server/db/schema.ts`:

- `src/server/db/schema/product.ts`
  - `products`
    - `id`, `slug`, `title`, `description`, `status` (draft/published/archived)
    - `thumbnail_url`, `created_at`, `updated_at`
  - `product_variants`
    - `id`, `product_id`, `size`, `color`, `sku`
    - `retail_price`, `currency`, `availability_status`
    - `printful_variant_id` (catalog variant), `printful_sync_variant_id`, `printful_external_variant_id`
  - `product_images`
    - `id`, `product_id`, `url`, `sort_order`
  - `product_drafts`
    - `id`, `product_id`, `draft_data` (json), `created_at`

- `src/server/db/schema/printful.ts`
  - `printful_sync_products`
    - `id`, `product_id`, `printful_sync_product_id`, `printful_external_product_id`
    - `synced_at`, `status`
  - `printful_files`
    - `id`, `product_variant_id`, `placement_type`
    - `file_url`, `file_hash`, `printful_file_id`, `status`

- `src/server/db/schema/orders.ts`
  - `orders`
    - `id`, `status`, `stripe_session_id`
    - `printful_order_id`, `printful_external_order_id`
    - `email`, `shipping_address` (json), `created_at`
  - `order_items`
    - `id`, `order_id`, `product_variant_id`
    - `quantity`, `unit_price`, `currency`

Notes:
- MVP is **t-shirts only**, so limit catalog selection and placements to t-shirt options.
- Store Printful IDs and external IDs to make sync deterministic.
- Use versioned file URLs to avoid Printful file caching issues.

## Auth approach

Admin-only CMS uses a lightweight allowlist:

- Environment-based allowlist (email list or admin token).
- `adminProcedure` in `src/server/api/trpc.ts` for tRPC endpoints.
- Optional middleware for `/admin` routes to block non-admin access.

No user auth for storefront or checkout in MVP.

## API routes

tRPC routers under `src/server/api/routers/`:

- `adminProducts`
  - `createDraft`
  - `updateDraft`
  - `publishProduct`
  - `listDrafts`
  - `listProducts`
  - `syncToPrintful`
  - `updateVariantPricing`

- `storefront`
  - `listPublishedProducts`
  - `getProductBySlug`
  - `getVariantAvailability`

- `orders`
  - `createCheckoutSession`
  - `createOrderFromStripe`
  - `getOrderStatus`

Next.js API routes in `src/app/api/`:

- `stripe/webhook` for payment confirmation.
- Optional `printful/webhook` for fulfillment updates.

## Printful integration

MVP scope: t-shirts only using Printful Products API + Orders API.

Core flow:

1. Admin selects T-shirt catalog variants (`variant_id` via Catalog API).
2. Upload print files to DigitalOcean Spaces, store public URLs.
3. Create Sync Product:
   - `POST /store/products`
   - `sync_product` with `name`, `external_id`, `thumbnail`
   - `sync_variants` with `variant_id`, `retail_price`, `files`
4. Store returned `sync_product_id` and `sync_variant_id`.
5. On paid checkout:
   - Create Printful order with `sync_variant_id` and recipient.
   - Use `external_id` to link to internal order.

Required Printful scopes:
- `sync_products` (read/write)
- `orders` (read/write)
- `file_library` (if using file IDs; optional if using URLs)
