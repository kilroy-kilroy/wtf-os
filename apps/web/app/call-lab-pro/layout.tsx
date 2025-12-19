import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call Lab Pro App | Deep Call Analysis & Strategic Follow-Ups',
  description: 'Access the Pro version of Call Lab for deep AI-driven call analysis, performance scoring, objection insights, and personalized follow-up campaigns inside your workflow.',
};

export default function CallLabProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
