import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Lab App | Instant Prospect Research & Sales Call Prep',
  description: 'Log in to Discovery Lab to generate deep prospect insights, company overviews, pain points, and smart discovery questions in 60 seconds so you walk into sales calls ready, not guessing.',
};

export default function DiscoveryLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
