import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';
import { onOutcomeNudge } from '@/lib/loops';

// Lazy-load Supabase client to avoid build-time errors
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Nudge calls that are 3-14 days old without an outcome
const NUDGE_AFTER_DAYS = 3;
const STOP_NUDGING_AFTER_DAYS = 14;

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

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

        // Send via Loops event
        const loopsResult = await onOutcomeNudge(
          user.email,
          user.first_name || 'there',
          callDate,
          prospect,
          call.id
        );

        if (!loopsResult.success) {
          throw new Error(loopsResult.error || 'Loops event failed');
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
