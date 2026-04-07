/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@indiforge/shared', '@indiforge/core'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;