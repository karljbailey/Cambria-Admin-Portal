import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for Netlify deployment
  output: 'standalone',
  experimental: {
    // Reduce bundle size
    optimizeCss: true,
  },
  // Disable telemetry
  telemetry: false,
};

export default nextConfig;
