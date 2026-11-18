import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined
  ? process.env.NEXT_PUBLIC_BASE_PATH
  : '/txgevent';

const nextConfig: NextConfig = {
<<<<<<< HEAD
  basePath: basePath || undefined,
=======
  /* config options here */
  experimental: {
    agentUpgrade: "security",
  },
>>>>>>> e2dde7d (upgrade(security): update Next.js from 16.4.4 to 16.4.6)
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
