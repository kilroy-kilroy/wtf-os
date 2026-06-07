import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { findAuthUserByEmail } from '@/lib/auth-admin';
import { onClientPasswordReset } from '@/lib/loops';

// Issues a one-time reset token and emails a /client/activate?reset= link.
// ALWAYS returns a generic success to prevent email enumeration.
export async function POST(request: NextRequest) {
  const generic = NextResponse.json({ success: true });
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') return generic;

    const supabase = getSupabaseServerClient();
    const authUser = await findAuthUserByEmail(email.toLowerCase());
    if (!authUser) return generic;

    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!enrollment) return generic;

    const { data: resetRow, error } = await supabase
      .from('client_password_resets')
      .insert({ user_id: authUser.id })
      .select('token')
      .single();
    if (error || !resetRow) {
      console.error('reset-request insert failed:', error?.message);
      return generic;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const resetUrl = `${appUrl}/client/activate?reset=${resetRow.token}`;

    const { data: profile } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', authUser.id)
      .maybeSingle();

    await onClientPasswordReset(email.toLowerCase(), profile?.first_name || '', resetUrl, 60);
    return generic;
  } catch (err) {
    console.error('reset-request error:', err);
    return generic;
  }
}
