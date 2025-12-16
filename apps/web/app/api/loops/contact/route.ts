import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createOrUpdateContact, onCallLabSignup } from '@/lib/loops';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, companyName, role, salesTeamSize } = body;

    // Create or update contact in Loops
    const contactResult = await createOrUpdateContact({
      email: user.email!,
      firstName,
      lastName,
      companyName,
      role,
      salesTeamSize,
      source: 'call_lab_onboarding',
      callLabTier: 'free',
      userGroup: 'call_lab_free',
      signupDate: new Date().toISOString(),
    });

    if (!contactResult.success) {
      console.error('Failed to create Loops contact:', contactResult.error);
      // Don't fail the request - Loops is non-critical
    }

    // Fire the signup event to start nurture sequence
    const eventResult = await onCallLabSignup(user.email!, firstName, companyName);

    if (!eventResult.success) {
      console.error('Failed to send Loops signup event:', eventResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Loops contact API error:', error);
    // Return success even if Loops fails - it's non-critical
    return NextResponse.json({ success: true, warning: 'Email marketing integration temporarily unavailable' });
  }
}
