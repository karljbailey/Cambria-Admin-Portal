import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for Docker deployment
  output: 'standalone',
  // Disable telemetry
  telemetry: false,
  // Ensure proper server configuration
  experimental: {
    // Enable standalone output
    outputFileTracingRoot: undefined,
  },
  // Optimize for production
  compress: true,
  poweredByHeader: false,
  // Ensure proper host binding
  serverRuntimeConfig: {
    // Will only be available on the server side
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
  },
};

export default nextConfig;
