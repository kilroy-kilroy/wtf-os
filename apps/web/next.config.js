/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/db', '@repo/prompts', '@repo/ui', '@repo/utils', '@repo/pdf'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  async headers() {
    return ['/api/analyze/:path*','/api/ingest/:path*','/api/call-lab-instant/:path*','/api/export/:path*','/api/coaching/:path*','/call-lab/report/:path*','/discovery-lab/report/:path*','/call-lab-instant/report/:path*'].map(source => ({source, headers: [
      {key: 'Cache-Control', value: 'private, no-store'},
      {key: 'Referrer-Policy', value: 'no-referrer'},
      {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
    ]}));
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
