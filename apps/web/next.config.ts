import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker image serves this process. No standalone trace — monorepo-friendly.
  transpilePackages: ["@pilotdeck/db", "@pilotdeck/mcp-core"],
  // Hard rule: no external fonts, analytics, images, or phone-home.
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
