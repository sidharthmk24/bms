import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['typeorm', 'mysql2', 'bcrypt', 'typeorm-naming-strategies', 'reflect-metadata', 'pg'],
  distDir: process.env.TEST_MODE === '1' ? '.next-test' : '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.optimization.minimize = false;
    }
    return config;
  },
};

export default nextConfig;
