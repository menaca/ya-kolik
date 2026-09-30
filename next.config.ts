import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    cachedNavigations: true,
  },
};

export default nextConfig;
