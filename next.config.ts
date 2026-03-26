import type { NextConfig } from "next";

const SPRITE_LAB_URL = process.env.SPRITE_LAB_URL || "http://localhost:4001";
const SHAWNDERMIND_URL = process.env.SHAWNDERMIND_URL || "http://localhost:5173";
const UI_LAB_URL = process.env.UI_LAB_URL || "http://localhost:4003";
const CONCEPT_LAB_URL = process.env.CONCEPT_LAB_URL || "http://localhost:5174";

const nextConfig: NextConfig = {
  transpilePackages: ["@shawnderland/ui", "@shawnderland/ai", "@shawnderland/serling", "@shawnderland/fielder", "@shawnderland/pera", "@tools/walter", "@tools/writing-room"],
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  async rewrites() {
    return [
      {
        source: "/api/tools/sprite-lab/:path*",
        destination: `${SPRITE_LAB_URL}/api/:path*`,
      },
      {
        source: "/api/tools/ideation/:path*",
        destination: `${SHAWNDERMIND_URL}/api/:path*`,
      },
      {
        source: "/api/tools/ui-lab/:path*",
        destination: `${UI_LAB_URL}/api/:path*`,
      },
      {
        source: "/api/tools/concept-lab/:path*",
        destination: `${CONCEPT_LAB_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
