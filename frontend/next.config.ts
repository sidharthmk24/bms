import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['typeorm', 'mysql2', 'bcrypt', 'typeorm-naming-strategies', 'reflect-metadata'],
  distDir: process.env.TEST_MODE === '1' ? '.next-test' : '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
