import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal | Tim Kilroy',
  description: 'Access your program dashboard, tools, and resources.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
