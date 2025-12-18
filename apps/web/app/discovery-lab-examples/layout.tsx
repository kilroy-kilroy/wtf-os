import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Lab Report Examples | SalesOS Prospect Insights',
  description: 'See real Discovery Lab outputs including company profiles, key questions and insight summaries so you know what to expect before you run your own prospect research.',
};

export default function DiscoveryLabExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
