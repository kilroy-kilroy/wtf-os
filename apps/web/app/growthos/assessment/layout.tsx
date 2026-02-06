import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth-server';

export default async function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/growthos');
  }

  return <>{children}</>;
}
