import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab Pro Example Report | Deep AI Call Analysis',
  description: 'Explore a Call Lab Pro sample with rich analysis including objection insights, performance takeaways and suggested follow-up text to elevate your next follow-up.',
};

export default function CallLabProExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
