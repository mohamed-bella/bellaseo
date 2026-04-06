import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from climbing up to the root folder of the VPS
  // which causes the "failed-to-find-server-action" error
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
