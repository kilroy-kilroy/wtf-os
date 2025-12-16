import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { subDays, format } from 'date-fns';

// Lazy-load clients to avoid build-time errors
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getResend = () => new Resend(process.env.RESEND_API_KEY);

// Nudge calls that are 3-7 days old without an outcome
const NUDGE_AFTER_DAYS = 3;
const STOP_NUDGING_AFTER_DAYS = 14;

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const FROM_EMAIL = process.env.FROM_EMAIL || 'coaching@timkilroy.com';

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const resend = getResend();

    const now = new Date();
    const nudgeStart = subDays(now, STOP_NUDGING_AFTER_DAYS).toISOString();
    const nudgeEnd = subDays(now, NUDGE_AFTER_DAYS).toISOString();

    // Find calls without outcomes that are within the nudge window
    // Also check that we haven't nudged them in the last 2 days
    const twoDaysAgo = subDays(now, 2).toISOString();

    const { data: callsToNudge, error: fetchError } = await supabase
      .from('call_lab_reports')
      .select(`
        id,
        user_id,
        buyer_name,
        company_name,
        call_date,
        created_at,
        last_nudge_at,
        users!inner (
          email,
          first_name
        )
      `)
      .or('outcome.is.null,outcome.eq.unknown')
      .gte('created_at', nudgeStart)
      .lte('created_at', nudgeEnd)
      .or(`last_nudge_at.is.null,last_nudge_at.lt.${twoDaysAgo}`)
      .limit(50);

    if (fetchError) {
      console.error('Error fetching calls for nudge:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    if (!callsToNudge || callsToNudge.length === 0) {
      return NextResponse.json({ success: true, nudged: 0 });
    }

    const results = {
      nudged: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const call of callsToNudge) {
      try {
        // Supabase returns users as an array when using joins
        const usersData = call.users as unknown as { email: string; first_name: string }[];
        const user = Array.isArray(usersData) ? usersData[0] : usersData;

        if (!user?.email) {
          console.error(`No user email for call ${call.id}`);
          continue;
        }

        const callDate = call.call_date
          ? format(new Date(call.call_date), 'MMM d')
          : format(new Date(call.created_at), 'MMM d');
        const prospect = call.buyer_name || call.company_name || 'your prospect';

        const updateUrl = `${APP_URL}/calls/${call.id}/outcome`;

        const subject = `Quick check: How did the call with ${prospect} go?`;
        const body = `
Hi ${user.first_name || 'there'},

Just checking in about your call from ${callDate} with ${prospect}.

How did it turn out?

- Won the deal
- Lost the deal
- Got ghosted
- Set a next step

Update it here (takes 2 seconds):
${updateUrl}

Tracking outcomes helps your coaching reports be more accurate.
If you'd rather skip this one, no worries -- I'll stop asking after a couple weeks.

- Your WTF Coach
        `.trim();

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: `WTF Sales Coach <${FROM_EMAIL}>`,
          to: user.email,
          subject,
          text: body,
        });

        if (emailError) {
          throw new Error(emailError.message);
        }

        // Update last_nudge_at
        await supabase
          .from('call_lab_reports')
          .update({ last_nudge_at: new Date().toISOString() })
          .eq('id', call.id);

        results.nudged++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Call ${call.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Outcome nudge cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
