import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab App | AI Sales Call Feedback & Follow-Up Tool',
  description: 'Log in to Call Lab to upload call transcripts, get honest AI feedback on what worked and what did not, and generate follow-up messages that drive next steps.',
  // This is the live tool, not a marketing page. Keep it out of organic search so it
  // doesn't cannibalize the landing page at timkilroy.com/call-lab, which is the SEO
  // asset built to rank. `follow` still lets link equity flow through outbound links.
  robots: { index: false, follow: true },
};

export default function CallLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
