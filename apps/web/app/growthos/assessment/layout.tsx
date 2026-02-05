import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase-auth';

export default async function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/growthos');
  }

  return <>{children}</>;
}
