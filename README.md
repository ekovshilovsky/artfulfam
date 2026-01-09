# ArtfulFam Platform

A monorepo containing the ArtfulFam e-commerce platform built with Hydrogen/Oxygen storefront, NestJS backend, and contributor admin.

## Repository Structure

```
repo/
├── apps/
│   ├── storefront/          # Hydrogen/Oxygen storefront (deployed to Oxygen)
│   ├── api/                 # NestJS backend (deployed to Vercel) - coming soon
│   └── contributor-admin/   # Vite React admin (deployed to Vercel) - coming soon
├── packages/
│   ├── contracts/           # Zod schemas → OpenAPI → generated client
│   ├── domain/              # Pure business logic (validation, pricing)
│   ├── pod/                 # Print-on-Demand provider abstraction (Printful)
│   ├── shopify/             # Shopify OAuth, Admin API, webhooks helpers
│   └── config/              # Shared TypeScript/ESLint config
├── tooling/
│   └── scripts/             # Catalog sync and maintenance scripts
├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # pnpm workspace configuration
└── package.json             # Root package.json
```

## Prerequisites

- Node.js >= 22
- pnpm 10.27.0

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Run Storefront Locally

```bash
# Copy environment file
cp apps/storefront/.env.example apps/storefront/.env
# Edit .env with your Shopify credentials

# Start the storefront dev server
pnpm dev:storefront
```

The storefront will be available at http://localhost:3000

### Run All Apps (Dev Mode)

```bash
pnpm dev
```

### Build All Packages

```bash
pnpm build
```

### Type Check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

## Apps

### Storefront (`apps/storefront`)

Hydrogen v2 storefront deployed to Shopify Oxygen.

- [Hydrogen Documentation](https://shopify.dev/custom-storefronts/hydrogen)
- [Oxygen Documentation](https://shopify.dev/docs/api/oxygen)

### API (`apps/api`) - Coming Soon

NestJS backend for:
- POD template management
- Product draft workflows
- Shopify multi-tenant OAuth
- Webhook processing

### Contributor Admin (`apps/contributor-admin`) - Coming Soon

Vite React admin for contributors to:
- Create product designs
- Manage drafts
- View profit goals

## Packages

### `@repo/contracts`

Contract-first API definitions using Zod schemas with OpenAPI and client generation.

### `@repo/domain`

Pure business logic for validation, pricing, and profit calculations.

### `@repo/pod`

Print-on-Demand provider abstraction with Printful adapter.

### `@repo/shopify`

Shopify OAuth, Admin API client, and webhook verification helpers.

### `@repo/config`

Shared TypeScript and ESLint configuration.

## Environment Variables

See `apps/storefront/.env.example` for required environment variables.

## Deployment

### Storefront (Oxygen)

The storefront is automatically deployed to Oxygen on push via GitHub Actions.

### Backend & Admin (Vercel)

Coming soon.

## License

Proprietary - All rights reserved.
