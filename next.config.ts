import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for Netlify deployment
  output: 'standalone',
  // Disable telemetry
  telemetry: false,
};

export default nextConfig;
