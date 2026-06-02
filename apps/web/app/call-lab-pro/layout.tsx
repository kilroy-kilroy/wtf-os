import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab Pro App | Deep Call Analysis & Strategic Follow-Ups',
  description: 'Access the Pro version of Call Lab for deep AI-driven call analysis, performance scoring, objection insights, and personalized follow-up campaigns inside your workflow.',
  // The page itself redirects to timkilroy.com/call-lab-pro (the marketing page), which
  // is what consolidates ranking signal. This noindex is a defensive backstop in case the
  // redirect is ever removed — the marketing page stays the single SEO destination.
  robots: { index: false, follow: true },
};

export default function CallLabProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
