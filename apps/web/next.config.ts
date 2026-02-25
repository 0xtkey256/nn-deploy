import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nn-deploy/compiler', '@nn-deploy/runtime'],
};

export default nextConfig;
