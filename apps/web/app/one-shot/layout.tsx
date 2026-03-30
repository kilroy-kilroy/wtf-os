import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth-server';

const ALLOWED_EMAILS = [
  'tim@timkilroy.com',
  'tk@timkilroy.com',
];

export default async function OneShotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ALLOWED_EMAILS.includes(user.email ?? '')) {
    redirect('/login?next=/one-shot');
  }

  return <>{children}</>;
}
