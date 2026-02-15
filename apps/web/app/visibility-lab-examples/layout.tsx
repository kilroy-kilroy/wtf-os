import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visibility Lab Report Examples | DemandOS Visibility Engine',
  description: 'See real Visibility Lab outputs including visibility scores, competitor intel, content strategies and 90-day execution plans so you know what to expect before you run your own analysis.',
};

export default function VisibilityLabExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
