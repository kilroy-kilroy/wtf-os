import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visibility Lab Pro Example Report | Advanced Visibility Intelligence',
  description: 'Review a Visibility Lab Pro example featuring the Kilroy Visibility Index, buyer journey mapping, competitor war room, operator profiling and content intelligence.',
};

export default function VisibilityLabProExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
