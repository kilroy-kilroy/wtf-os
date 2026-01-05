import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { onCoachingReportReady } from '@/lib/loops';

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

    // Get pending emails
    const { data: pendingReports, error: fetchError } = await supabase
      .from('coaching_reports')
      .select(`
        id,
        user_id,
        report_type,
        period_start,
        period_end,
        users!inner (
          email,
          first_name
        )
      `)
      .eq('email_status', 'pending')
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('Error fetching pending reports:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending reports' }, { status: 500 });
    }

    if (!pendingReports || pendingReports.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const report of pendingReports) {
      try {
        // Supabase returns users as an array when using joins
        const usersData = report.users as unknown as { email: string; first_name: string }[];
        const user = Array.isArray(usersData) ? usersData[0] : usersData;

        if (!user?.email) {
          console.error(`No user email for report ${report.id}`);
          continue;
        }

        // Send via Loops event (email template managed in Loops dashboard)
        const loopsResult = await onCoachingReportReady(
          user.email,
          report.report_type as 'weekly' | 'monthly' | 'quarterly',
          report.id,
          report.period_start,
          report.period_end,
          user.first_name
        );

        if (!loopsResult.success) {
          throw new Error(loopsResult.error || 'Loops event failed');
        }

        // Update status
        await supabase
          .from('coaching_reports')
          .update({
            email_status: 'sent',
            email_sent_at: new Date().toISOString(),
          })
          .eq('id', report.id);

        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Report ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Mark as failed
        await supabase
          .from('coaching_reports')
          .update({ email_status: 'failed' })
          .eq('id', report.id);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Email sending cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
