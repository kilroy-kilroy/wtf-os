import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onClientInvited } from '@/lib/loops';

// Admin-only: Create a client invite and send onboarding email
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name, program_slug, role = 'primary' } = await request.json();

    if (!email || !program_slug) {
      return NextResponse.json({ error: 'email and program_slug are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

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

    // Create user without password — they'll use magic links.
    // If the email already has an account, createUser returns an error with
    // user: null. That's expected for re-invites; we handle it below.
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

    // Generate magic link. generateLink returns the user object for BOTH a
    // freshly-created user and a pre-existing one, so it's our reliable source
    // for the user id when createUser returned user: null.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${appUrl}/client/onboarding`,
      },
    });

    if (linkError) {
      console.error('Failed to generate magic link:', linkError);
    }

    // Resolve the user id whether they were just created or already existed.
    const userId = authData?.user?.id || linkData?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Failed to provision client account',
          message: authError?.message || linkError?.message || 'Could not resolve user',
        },
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

    // Mark invite as accepted (we pre-created/linked the account).
    await supabase
      .from('client_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    const magicLink = linkData?.properties?.action_link || `${appUrl}/client/login`;
    const firstName = (full_name || '').split(' ')[0] || '';

    await onClientInvited(email.toLowerCase(), firstName, program.name, magicLink);

    return NextResponse.json({
      success: true,
      invite_id: invite.id,
      user_created: !!authData?.user,
      already_existed: !!alreadyRegistered,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: List all invites (admin)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
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
