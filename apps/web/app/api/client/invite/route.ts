import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createOrUpdateContact, sendEvent } from '@/lib/loops';

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

    // Create user account with temp password
    const tempPassword = `Welcome${Date.now().toString(36)}!`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        invited_to_program: program.slug,
      },
    });

    if (authError) {
      // User might already exist - that's OK
      if (!authError.message?.includes('already been registered')) {
        console.error('User creation error:', authError);
      }
    }

    // If user was created, create enrollment
    if (authData?.user) {
      await supabase.from('client_enrollments').insert({
        user_id: authData.user.id,
        program_id: program.id,
        role,
        onboarding_completed: false,
      });

      // Mark invite as accepted (since we pre-created the account)
      await supabase
        .from('client_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);
    }

    // Send invite email via Loops
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const firstName = full_name?.split(' ')[0] || '';

    await createOrUpdateContact({
      email: email.toLowerCase(),
      firstName,
      source: 'client_invite',
      subscribed: true,
      userGroup: `client_${program.slug}`,
    });

    await sendEvent({
      email: email.toLowerCase(),
      eventName: 'client_invited',
      eventProperties: {
        firstName,
        programName: program.name,
        loginUrl: `${appUrl}/client/login`,
        tempPassword,
      },
    });

    return NextResponse.json({
      success: true,
      invite_id: invite.id,
      user_created: !!authData?.user,
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
