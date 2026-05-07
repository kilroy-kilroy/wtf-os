import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Are You Ready to Hire a BD Resource? | WTF Agency Assessment',
  description: "Most agency CEOs think a BD hire creates deals. They don't. Find out if you're actually ready.",
};

export default function BizDevAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
