import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When `next build` runs with cwd = apps/web, this avoids Turbopack picking a parent lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
