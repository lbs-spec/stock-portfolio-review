import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: process.cwd(),
  output: process.env.LOCAL_EXPORT === "1" ? "export" : undefined,
  distDir: process.env.LOCAL_EXPORT === "1" ? "dist" : ".next",
};

export default nextConfig;
