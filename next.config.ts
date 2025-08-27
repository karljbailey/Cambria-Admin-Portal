import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for Netlify deployment
  output: 'standalone',
  
  // Webpack configuration to handle server-side modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side configuration - provide fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Handle handlebars require.extensions issue
    config.module.rules.push({
      test: /node_modules\/handlebars\/lib\/index\.js$/,
      use: 'null-loader',
    });
    
    return config;
  },
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

export default nextConfig;
