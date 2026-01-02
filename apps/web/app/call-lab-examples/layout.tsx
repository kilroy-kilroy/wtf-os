import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab Example Reports | AI Sales Call Feedback',
  description: 'Browse sample Call Lab reports showing real AI feedback, scoring highlights and example follow-up messages so you can preview the value before you submit your own calls.',
};

export default function CallLabExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
