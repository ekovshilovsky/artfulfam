/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Enable Cache Components for the new "use cache" directive
  cacheComponents: true,

  experimental: {
    // Enable Turbopack file system caching for production builds (opt-in)
    turbopackFileSystemCacheForBuild: true,
  },

  // Security headers - applied globally via config (more efficient than proxy)
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default config;
