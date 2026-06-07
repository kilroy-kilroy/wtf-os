import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { findAuthUserByEmail } from '@/lib/auth-admin';

// Sets a client's password from a one-time token. Two token sources:
//   - `token` → client_invites.invite_token  (first-time activation)
//   - `reset` → client_password_resets.token  (forgot-password)
// Service-role only; no user session required.
export async function POST(request: NextRequest) {
  try {
    const { token, reset, password } = await request.json();

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!token && !reset) {
      return NextResponse.json({ error: 'Missing activation token.' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();
    let email: string | null = null;

    if (reset) {
      const { data: row } = await supabase
        .from('client_password_resets')
        .select('id, user_id, expires_at, used_at')
        .eq('token', reset)
        .maybeSingle();

      if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This reset link is invalid or has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      const { error: pwErr } = await supabase.auth.admin.updateUserById(row.user_id, {
        password,
        email_confirm: true,
      });
      if (pwErr) {
        console.error('reset updateUserById failed:', pwErr.message);
        return NextResponse.json({ error: 'Could not set password.' }, { status: 500 });
      }

      await supabase.from('client_password_resets').update({ used_at: nowIso }).eq('id', row.id);
      const { data: u } = await supabase.auth.admin.getUserById(row.user_id);
      email = u.user?.email ?? null;
    } else {
      const { data: invite } = await supabase
        .from('client_invites')
        .select('id, email, status, expires_at')
        .eq('invite_token', token)
        .maybeSingle();

      const inviteExpired = invite?.expires_at ? new Date(invite.expires_at) < new Date() : false;
      if (!invite || invite.status !== 'pending' || inviteExpired) {
        return NextResponse.json(
          { error: 'This invite link is invalid, already used, or expired. Please reset your password instead.' },
          { status: 400 }
        );
      }

      const authUser = await findAuthUserByEmail(invite.email);
      if (!authUser) {
        return NextResponse.json({ error: 'Account not found for this invite.' }, { status: 404 });
      }

      const { error: pwErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
      });
      if (pwErr) {
        console.error('activate updateUserById failed:', pwErr.message);
        return NextResponse.json({ error: 'Could not set password.' }, { status: 500 });
      }

      await supabase
        .from('client_invites')
        .update({ status: 'accepted', accepted_at: nowIso })
        .eq('id', invite.id);
      email = invite.email;
    }

    return NextResponse.json({ success: true, email });
  } catch (err) {
    console.error('Activate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
