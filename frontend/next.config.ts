import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,

  allowedDevOrigins: [
    "77.42.43.52",
    "77.42.43.52:3000",
    "http://77.42.43.52:3000",
    "localhost",
    "localhost:3000",
    "openseo.app.mohamedbella.com"
  ],

  // Strip console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Compress static assets
  compress: true,

  // Faster image loading
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },

  // Reduce bundle by only including used locales
  i18n: undefined,

  // Aggressive page caching headers for static assets
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
};

export default nextConfig;
