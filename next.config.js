/** @type {import('next').NextConfig} */
const isGhPages = !!process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // For project pages like username.github.io/repo, set NEXT_PUBLIC_BASE_PATH="/repo"
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

module.exports = nextConfig;
