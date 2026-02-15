import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visibility Lab Example Report | DemandOS Visibility Engine',
  description: 'Review a Visibility Lab example featuring visibility scoring, VVV audit, competitor battlecards, content gaps and a 90-day execution plan.',
};

export default function VisibilityLabExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
