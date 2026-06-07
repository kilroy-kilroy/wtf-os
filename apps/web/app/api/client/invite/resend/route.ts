import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onClientInvited, onClientPasswordReset } from '@/lib/loops';

// Admin-only: Resend a working self-service link for an existing enrollment.
// If the invite is still pending, re-send the activation link; otherwise the
// client is already provisioned, so send a password-reset link instead.
// (No Supabase magic links — same own-token flow as invite/route.ts.)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollment_id } = await request.json();

    if (!enrollment_id) {
      return NextResponse.json({ error: 'enrollment_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Look up enrollment with user and program info
    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id, user_id, program_id, onboarding_completed, program:client_programs(name, slug)')
      .eq('id', enrollment_id)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Get user details
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(enrollment.user_id);

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const program = enrollment.program as any;
    const firstName = user.user_metadata?.full_name?.split(' ')[0] || '';

    // Prefer re-sending the activation link for a still-pending invite.
    const { data: pendingInvite } = await supabase
      .from('client_invites')
      .select('invite_token')
      .eq('email', user.email!.toLowerCase())
      .eq('program_id', enrollment.program_id)
      .eq('status', 'pending')
      .maybeSingle();

    let emailResult: { success: boolean; error?: string };
    let linkType: string;

    if (pendingInvite?.invite_token) {
      const activationUrl = `${appUrl}/client/activate?token=${pendingInvite.invite_token}`;
      emailResult = await onClientInvited(user.email!, firstName, program?.name || 'Unknown Program', activationUrl);
      linkType = 'activation link';
    } else {
      // Already activated (or no pending invite): issue a password-reset link so
      // the admin can always get the client a working self-service link.
      const { data: resetRow, error: resetErr } = await supabase
        .from('client_password_resets')
        .insert({ user_id: enrollment.user_id })
        .select('token')
        .single();

      if (resetErr || !resetRow) {
        return NextResponse.json(
          { error: 'Failed to issue reset link', message: resetErr?.message },
          { status: 500 }
        );
      }

      const resetUrl = `${appUrl}/client/activate?reset=${resetRow.token}`;
      emailResult = await onClientPasswordReset(user.email!, firstName, resetUrl, 60);
      linkType = 'password reset link';
    }

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Link generated but the email failed to send', message: emailResult.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invite resent to ${user.email} with ${linkType}`,
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
