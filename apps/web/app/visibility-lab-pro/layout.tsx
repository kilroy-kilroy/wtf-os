import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visibility Lab Pro App | Advanced Brand Visibility & Demand Intelligence',
  description: 'Access Visibility Lab Pro for deep brand visibility analysis across channels, competitors, and audiences — surface the demand gaps and opportunities you are missing.',
  // This is the live tool, not a marketing page. Keep it out of organic search so it
  // doesn't cannibalize the landing page on timkilroy.com, which is the SEO asset.
  // The page is a client component, so this server layout carries the metadata.
  robots: { index: false, follow: true },
};

export default function VisibilityLabProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
