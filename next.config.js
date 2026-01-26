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
    // Enable Turbopack file system caching for production builds
    turbopackFileSystemCacheForBuild: true,
  },
};

export default config;
