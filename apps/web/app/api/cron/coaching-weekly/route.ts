import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { subDays, startOfWeek, endOfWeek, format } from 'date-fns';

// Lazy-load clients to avoid build-time errors
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Calculate the previous week's date range
    // Sunday 00:00 to Saturday 23:59
    const now = new Date();
    const previousWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 0 });
    const previousWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 0 });

    const periodStart = format(previousWeekStart, 'yyyy-MM-dd');
    const periodEnd = format(previousWeekEnd, 'yyyy-MM-dd');

    console.log(`Generating weekly coaching reports for ${periodStart} to ${periodEnd}`);

    // Get all users with coaching enabled
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, org_id')
      .not('org_id', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const user of users || []) {
      try {
        // Check if user has calls in the period
        const { data: calls, error: callsError } = await supabase
          .from('call_lab_reports')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', periodStart)
          .lte('created_at', periodEnd + 'T23:59:59');

        if (callsError) {
          results.errors.push(`User ${user.id}: ${callsError.message}`);
          continue;
        }

        // Skip if no calls
        if (!calls || calls.length === 0) {
          results.skipped++;
          continue;
        }

        // Check if report already exists
        const { data: existingReport } = await supabase
          .from('coaching_reports')
          .select('id')
          .eq('user_id', user.id)
          .eq('report_type', 'weekly')
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .single();

        if (existingReport) {
          results.skipped++;
          continue;
        }

        // Generate the report via our API
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const generateResponse = await fetch(`${baseUrl}/api/coaching/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            report_type: 'weekly',
            period_start: periodStart,
            period_end: periodEnd,
          }),
        });

        if (!generateResponse.ok) {
          const error = await generateResponse.json();
          results.errors.push(`User ${user.id}: ${error.error}`);
          continue;
        }

        const { report_id } = await generateResponse.json();

        // Queue email for Monday 6 AM (handled by separate cron)
        await supabase
          .from('coaching_reports')
          .update({ email_status: 'queued' })
          .eq('id', report_id);

        results.processed++;
      } catch (error) {
        results.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      period: { start: periodStart, end: periodEnd },
      results,
    });
  } catch (error) {
    console.error('Weekly coaching cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
