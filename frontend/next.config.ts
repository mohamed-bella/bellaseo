import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from climbing up to the root folder of the VPS
  // which causes the "failed-to-find-server-action" error
  outputFileTracingRoot: __dirname,
  
  // Whitelist external IPs/Domains for Hot Module Replacement (HMR) WebSockets
  allowedDevOrigins: [
    "77.42.43.52",
    "77.42.43.52:3000",
    "http://77.42.43.52:3000",
    "localhost",
    "localhost:3000",
    "openseo.app.mohamedbella.com"
  ],
};

export default nextConfig;
