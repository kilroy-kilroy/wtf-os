import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TeamMember {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AccountHolder {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  companyName: string;
  companyType: string;
  dealSize: string;
}

interface CreateAccountRequest {
  sessionId: string;
  accountHolder: AccountHolder;
  teamMembers: TeamMember[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAccountRequest = await request.json();
    const { sessionId, accountHolder, teamMembers } = body;

    // Validate required fields
    if (!sessionId || !accountHolder.email || !accountHolder.password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (accountHolder.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify Stripe session again to ensure this is a valid purchase
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Payment not verified' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', accountHolder.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: accountHolder.email,
      password: accountHolder.password,
      email_confirm: true,
      user_metadata: {
        first_name: accountHolder.firstName,
        last_name: accountHolder.lastName,
        role: accountHolder.role,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create user profile in database
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email: accountHolder.email,
      first_name: accountHolder.firstName,
      last_name: accountHolder.lastName,
      role: accountHolder.role,
      company_name: accountHolder.companyName,
      company_type: accountHolder.companyType,
      deal_size: accountHolder.dealSize,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      plan: teamMembers.length > 0 ? 'team' : 'solo',
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Try to clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Create team members if this is a team plan
    if (teamMembers.length > 0) {
      const teamInserts = teamMembers.map((member) => ({
        account_holder_id: userId,
        email: member.email,
        first_name: member.firstName,
        last_name: member.lastName,
        role: member.role,
        status: 'pending', // They'll need to accept invite
        created_at: new Date().toISOString(),
      }));

      const { error: teamError } = await supabase
        .from('team_members')
        .insert(teamInserts);

      if (teamError) {
        console.error('Team member error:', teamError);
        // Don't fail the whole request, just log it
      }

      // TODO: Send invitation emails to team members
      // await sendTeamInvitations(teamMembers, accountHolder);
    }

    // Update Stripe customer with user ID
    if (session.customer) {
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;

      await stripe.customers.update(customerId, {
        metadata: {
          user_id: userId,
          company_name: accountHolder.companyName,
        },
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
