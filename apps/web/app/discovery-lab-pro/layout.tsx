import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Lab Pro App | Advanced Sales Intelligence & Deal Prep',
  description: 'Access Discovery Lab Pro for advanced prospect intelligence including stakeholder maps, competitive analysis, objection predictions, and custom talk tracks to sharpen your sales strategy before every call.',
};

export default function DiscoveryLabProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
