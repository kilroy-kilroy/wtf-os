import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { createOrUpdateContact, onCallLabSignup } from '@/lib/loops';
import { addAppSignupSubscriber } from '@/lib/beehiiv';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createClient();
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

    // Add to Beehiiv newsletter (fire-and-forget)
    addAppSignupSubscriber(user.email!, firstName, lastName, companyName).catch((err) =>
      console.error('Beehiiv subscriber add failed:', err)
    );

    // Track signup completed in Vercel Analytics
    await trackServerEvent(AnalyticsEvents.SIGNUP_COMPLETED, {
      has_company: !!companyName,
      has_role: !!role,
      has_team_size: !!salesTeamSize,
      source: 'call_lab_onboarding',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Loops contact API error:', error);
    // Return success even if Loops fails - it's non-critical
    return NextResponse.json({ success: true, warning: 'Email marketing integration temporarily unavailable' });
  }
}
