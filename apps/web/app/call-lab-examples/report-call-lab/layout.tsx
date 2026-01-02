import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab Example Report | Sales Call Grader Preview',
  description: 'See a Call Lab example with graded call insights, strengths and improvement suggestions to understand how AI feedback helps sharpen your sales conversations.',
};

export default function CallLabExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
