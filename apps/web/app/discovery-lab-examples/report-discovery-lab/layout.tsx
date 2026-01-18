import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Lab Example Report | SalesOS Prospect Research',
  description: 'Explore an authentic Discovery Lab sample report with prospect intelligence, pain points and smart questions to guide real sales conversations.',
};

export default function DiscoveryLabExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
