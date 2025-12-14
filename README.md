# Shopify art store

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ekovshilovskys-projects/v0-shopify-art-store)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/cYy5eo5lA3f)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

#### Required Variables
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` - Your Shopify store domain (e.g., `your-store.myshopify.com`)
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` - Shopify Storefront API access token
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Shopify Admin API access token

#### Password Protection (Optional)
- `STORE_PASSWORD_ENABLED` - Set to `"true"` to enable password protection for the store
- `SHOPIFY_STORE_PASSWORD` - The password users must enter to access the store (required when `STORE_PASSWORD_ENABLED` is `"true"`)

**Note:** The password protection is controlled via environment variables and is independent of Shopify's built-in password protection feature. This gives you more flexibility to control access to your store from your application configuration.

## Deployment

Your project is live at:

**[https://vercel.com/ekovshilovskys-projects/v0-shopify-art-store](https://vercel.com/ekovshilovskys-projects/v0-shopify-art-store)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/cYy5eo5lA3f](https://v0.app/chat/cYy5eo5lA3f)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository