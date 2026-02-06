import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/call-lab',
          '/call-lab-instant',
          '/call-lab-pro',
          '/call-lab-examples',
          '/discovery-lab',
          '/discovery-lab-pro',
          '/discovery-lab-examples',
          '/visibility-engine',
          '/growthos',
          '/wtf-sales-guide',
          '/wtf-assessment-example',
          '/docs/',
          '/support',
          '/privacy',
          '/terms',
          '/login',
          '/upgrade',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/settings',
          '/onboarding/',
          '/labs',
          '/calls/',
          '/auth/',
          '/call-lab/report/',
          '/discovery-lab/report/',
          '/call-lab-instant/report/',
          '/call-lab-pro/checkout',
          '/call-lab-pro/welcome',
          '/discovery-lab-pro/checkout',
          '/discovery-lab-pro/create',
          '/discovery-lab-pro/welcome',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
