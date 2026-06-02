import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Lab Pro App | Advanced Sales Intelligence & Deal Prep',
  description: 'Access Discovery Lab Pro for advanced prospect intelligence including stakeholder maps, competitive analysis, objection predictions, and custom talk tracks to sharpen your sales strategy before every call.',
  // This is the live tool, not a marketing page. Keep it out of organic search so it
  // doesn't cannibalize the landing page on timkilroy.com, which is the SEO asset.
  robots: { index: false, follow: true },
};

export default function DiscoveryLabProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
