import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onClientInvited } from '@/lib/loops';
import { findAuthUserByEmail } from '@/lib/auth-admin';
import { requireAdminRequest } from '@/lib/contracts/require-admin';

// Admin-only: Create a client invite and send onboarding email
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminRequest(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name, program_slug, role = 'primary' } = await request.json();

    if (!email || !program_slug) {
      return NextResponse.json({ error: 'email and program_slug are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

    // Look up program
    const { data: program } = await supabase
      .from('client_programs')
      .select('id, name, slug')
      .eq('slug', program_slug)
      .single();

    if (!program) {
      return NextResponse.json({ error: `Program not found: ${program_slug}` }, { status: 404 });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('client_invites')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('program_id', program.id)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'Invite already exists for this email and program' }, { status: 409 });
    }

    // Create invite
    const { data: invite, error } = await supabase
      .from('client_invites')
      .insert({
        email: email.toLowerCase(),
        full_name: full_name || null,
        program_id: program.id,
        role,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create invite', message: error.message }, { status: 500 });
    }

    // Create the auth user without a password — they set one via /client/activate.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        invited_to_program: program.slug,
      },
    });

    const alreadyRegistered = authError?.message?.includes('already been registered');
    if (authError && !alreadyRegistered) {
      console.error('User creation error:', authError);
    }

    // Resolve the user id whether brand-new or pre-existing (re-invite).
    const userId =
      authData?.user?.id || (await findAuthUserByEmail(email.toLowerCase()))?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to provision client account', message: authError?.message || 'Could not resolve user' },
        { status: 500 }
      );
    }

    // Create enrollment (idempotent — a pre-existing user may already be enrolled).
    const { data: existingEnrollment } = await supabase
      .from('client_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('program_id', program.id)
      .maybeSingle();

    if (!existingEnrollment) {
      const { error: enrollError } = await supabase.from('client_enrollments').insert({
        user_id: userId,
        program_id: program.id,
        role,
        onboarding_completed: false,
      });
      if (enrollError) {
        return NextResponse.json(
          { error: 'Failed to enroll client', message: enrollError.message },
          { status: 500 }
        );
      }
    }

    // NOTE: invite stays `pending` until the client activates (sets a password).
    // The token must remain valid; /api/client/activate flips it to `accepted`.

    const activationUrl = `${appUrl}/client/activate?token=${invite.invite_token}`;
    const firstName = (full_name || '').split(' ')[0] || '';

    const emailResult = await onClientInvited(
      email.toLowerCase(),
      firstName,
      program.name,
      activationUrl
    );

    return NextResponse.json({
      success: true,
      invite_id: invite.id,
      user_created: !!authData?.user,
      already_existed: !!alreadyRegistered,
      email_sent: emailResult.success,
      email_error: emailResult.success ? undefined : emailResult.error,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: List all invites (admin)
export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminRequest(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { data: invites } = await supabase
      .from('client_invites')
      .select('*, program:client_programs(name, slug)')
      .order('created_at', { ascending: false });

    return NextResponse.json({ invites: invites || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
