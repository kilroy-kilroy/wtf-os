import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { subQuarters, startOfQuarter, endOfQuarter, format, getQuarter } from 'date-fns';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cron secret for verification
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the previous quarter's date range
    const now = new Date();
    const previousQuarter = subQuarters(now, 1);
    const quarterStart = startOfQuarter(previousQuarter);
    const quarterEnd = endOfQuarter(previousQuarter);

    const periodStart = format(quarterStart, 'yyyy-MM-dd');
    const periodEnd = format(quarterEnd, 'yyyy-MM-dd');
    const quarterLabel = `Q${getQuarter(previousQuarter)} ${format(previousQuarter, 'yyyy')}`;

    console.log(`Generating quarterly coaching reports for ${quarterLabel}`);

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

        // Skip if not enough calls for quarterly (need at least 5)
        if (!calls || calls.length < 5) {
          results.skipped++;
          continue;
        }

        // Check if report already exists
        const { data: existingReport } = await supabase
          .from('coaching_reports')
          .select('id')
          .eq('user_id', user.id)
          .eq('report_type', 'quarterly')
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
            report_type: 'quarterly',
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

        // Send email immediately for quarterly reports
        await supabase
          .from('coaching_reports')
          .update({ email_status: 'pending' })
          .eq('id', report_id);

        results.processed++;
      } catch (error) {
        results.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      period: { start: periodStart, end: periodEnd, quarter: quarterLabel },
      results,
    });
  } catch (error) {
    console.error('Quarterly coaching cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
