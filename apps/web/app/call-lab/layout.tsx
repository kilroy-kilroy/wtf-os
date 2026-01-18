import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab App | AI Sales Call Feedback & Follow-Up Tool',
  description: 'Log in to Call Lab to upload call transcripts, get honest AI feedback on what worked and what did not, and generate follow-up messages that drive next steps.',
};

export default function CallLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
