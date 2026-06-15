/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/db', '@repo/prompts', '@repo/ui', '@repo/utils', '@repo/pdf'],
  // Keep @react-pdf/renderer out of the server bundle: bundling it duplicates/
  // transforms its internal React and its reconciler then rejects elements with
  // "Minified React error #31". Required at runtime untransformed instead.
  serverExternalPackages: ['@react-pdf/renderer'],
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
