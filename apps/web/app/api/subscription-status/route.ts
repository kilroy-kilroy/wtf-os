import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSubscriptionStatus } from '@/lib/subscription';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const status = await getSubscriptionStatus(
    supabase as any,
    user.id,
    user.email || ''
  );

  return NextResponse.json({
    authenticated: true,
    ...status,
  });
}
