/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/db', '@repo/prompts', '@repo/ui', '@repo/utils', '@repo/pdf'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  async redirects() {
    return [
      {
        source: '/quick-analyze',
        destination: '/call-lab-instant',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
