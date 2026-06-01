import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visibility Lab App | AI Brand Visibility & Demand Analyzer',
  description: 'Use Visibility Lab to analyze where your brand shows up across channels, audiences and competitors — surface visibility gaps and demand opportunities you are missing.',
  // This is the live tool, not a marketing page. Keep it out of organic search so it
  // doesn't cannibalize the landing page on timkilroy.com, which is the SEO asset.
  robots: { index: false, follow: true },
};

export default function VisibilityLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
