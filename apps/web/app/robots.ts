import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Redirects logged-out visitors to /growthos, so crawling it only yields redirects.
        disallow: '/growthos/assessment',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
