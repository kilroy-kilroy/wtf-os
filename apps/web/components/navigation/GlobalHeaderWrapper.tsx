import { createClient } from '@/lib/supabase-auth-server';
import { GlobalHeader } from './GlobalHeader';

export async function GlobalHeaderWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user name from metadata or users table
  let userName = user?.user_metadata?.first_name || user?.user_metadata?.full_name;
  const userEmail = user?.email;

  // If no name in metadata, try to fetch from users table
  if (!userName && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name, full_name')
      .eq('id', user.id)
      .single();

    if (userData) {
      userName = userData.full_name || userData.first_name || undefined;
    }
  }

  return <GlobalHeader userName={userName} userEmail={userEmail} />;
}
