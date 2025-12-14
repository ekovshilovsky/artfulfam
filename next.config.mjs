/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow external images from Shopify CDN
  images: {
    unoptimized: true,
    domains: ['cdn.shopify.com'],
  },
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
}

export default nextConfig