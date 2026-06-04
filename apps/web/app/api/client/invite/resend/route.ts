import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onClientInvited } from '@/lib/loops';

// Admin-only: Resend invite email for an existing enrollment
// Generates a new magic link and re-triggers Loops event
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
      .select('id, user_id, onboarding_completed, program:client_programs(name, slug)')
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
    const next = enrollment.onboarding_completed ? '/client/dashboard' : '/client/onboarding';

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
    }

    // Self-hosted confirmation link (verifyOtp via /auth/confirm) — see invite/route.ts.
    const magicLink = `${appUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`;

    // Re-trigger Loops event
    const program = enrollment.program as any;
    const firstName = user.user_metadata?.full_name?.split(' ')[0] || '';

    const emailResult = await onClientInvited(user.email!, firstName, program?.name || 'Unknown Program', magicLink);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Magic link generated but the email failed to send', message: emailResult.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invite resent to ${user.email} with magic link`,
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
