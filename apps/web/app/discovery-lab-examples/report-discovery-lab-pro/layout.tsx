import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Lab Pro Example Report | Advanced Sales Prep',
  description: 'Review a Discovery Lab Pro example featuring stakeholder maps, competitive insights and tailored talk tracks to inform strategy before your next call.',
};

export default function DiscoveryLabProExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
