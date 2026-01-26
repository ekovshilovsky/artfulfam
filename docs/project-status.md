# Project status

## Purpose

This file summarizes what has been implemented so far and what remains to complete the MVP. It is intended for new contributors joining the project.

## Current goal (MVP)

Build a print‑on‑demand store for **t‑shirts only** with:
- Admin‑only CMS (token‑protected)
- Public storefront
- Stripe checkout
- Printful product sync + order creation

## Key decisions

- **Auth**: Admin‑only token via `x-admin-token` (no user auth in MVP).
- **Payments**: Stripe direct (no Clerk billing).
- **Printful**: Use Products API to sync t‑shirt variants and Orders API to create orders after payment.
- **Storage**: Print file assets stored in **DigitalOcean Spaces** with public URLs (IaC‑friendly).
- **Database**: Supabase Postgres (configured via `DATABASE_URL`).

## Files created/updated

### Schema split

Replaced single `schema.ts` with split modules and re‑exports:

- `src/server/db/schema/base.ts`
- `src/server/db/schema/product.ts`
- `src/server/db/schema/printful.ts`
- `src/server/db/schema/orders.ts`
- `src/server/db/schema/cms.ts`
- `src/server/db/schema.ts` (re‑exports)

### Admin protection

- `middleware.ts` protects `/admin/*`
  - Accepts token via `x-admin-token`
  - Also accepts `Authorization: Bearer <token>`
  - Query param `?admin_token=...` is allowed for quick browser access

### tRPC routers

Added routers and wired in `src/server/api/root.ts`:

- `adminProducts`
  - `createDraft`, `updateDraft`, `listDrafts`
  - `publishProduct` (creates product + variants + images)
  - `listProducts`
  - `updateVariantPricing`
- `storefront`
  - `listPublishedProducts`
  - `getProductBySlug`
- `orders`
  - `createCheckoutSession` (stubbed, no Stripe yet)
  - `createOrderFromStripe` (stubbed, no webhook yet)

### Docs

- `docs/mvp-plan.md`
- `docs/technical-docs.md`
- `docs/project-status.md` (this file)

## Environment variables

Required:

- `DATABASE_URL` (Supabase Postgres)
- `ADMIN_TOKEN` (admin route + tRPC protection)

Present in `.env`:

- Supabase DB URLs and keys from Vercel
- `DATABASE_URL` updated to non‑pooling URL (port 5432)

Note: `ADMIN_TOKEN` is currently set to a placeholder and must be replaced.

## Database schema (summary)

### Product

- `products`: basic product data + status
- `product_variants`: size/color/SKU, pricing, Printful IDs
- `product_images`: image list

### CMS

- `product_drafts`: JSON draft data
- `posts`: legacy example table kept for existing example router

### Printful

- `printful_sync_products`: mapping to Printful sync product IDs
- `printful_files`: per‑variant file URLs + placement types

### Orders

- `orders`: internal order + Stripe + Printful IDs
- `order_items`: per‑variant quantity + price

## What still needs to be built

### Admin CMS

- Admin UI routes under `/admin`
- Draft editor and publish workflow
- Printful sync UI and status

### Printful integration

- Printful API client
- Catalog lookup for **t‑shirt** variants only
- Sync product + sync variants using Printful Products API
- Order creation using Printful Orders API
- Optional webhook handling

### Stripe checkout

- Create Checkout Session (line items from variants)
- Stripe webhook to finalize orders
- Trigger Printful order creation after payment

### Storage (DigitalOcean Spaces)

- Create public bucket and CORS via IaC
- Upload print files and store versioned URLs
- Ensure Printful can fetch URLs

### Hardening

- Remove query‑param admin token if not wanted
- Add rate limiting and input validation for admin actions
- Add tests for publish flow and order flow

## Notes for new contributors

- Admin access requires `ADMIN_TOKEN` in `.env`.
- tRPC admin routes require `x-admin-token`.
- Do not use Clerk Billing for this project; Stripe is direct.
- Printful API requires a **Manual Order / API** store and proper scopes.
