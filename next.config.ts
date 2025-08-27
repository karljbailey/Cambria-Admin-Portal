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
        child_process: false,
        events: false,
        util: false,
        buffer: false,
        querystring: false,
        punycode: false,
        string_decoder: false,
        timers: false,
        tty: false,
        vm: false,
        worker_threads: false,
      };
    }
    
    // Handle handlebars require.extensions issue
    config.module.rules.push({
      test: /node_modules\/handlebars\/lib\/index\.js$/,
      use: 'null-loader',
    });
    
    return config;
  },
  
  // Server external packages (updated from deprecated experimental.serverComponentsExternalPackages)
  serverExternalPackages: ['firebase-admin'],
  
  // Experimental features
  experimental: {
    // Remove deprecated serverComponentsExternalPackages
  },
};

export default nextConfig;
