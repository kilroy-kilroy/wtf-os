import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { format } from 'date-fns';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Cron secret for verification
const CRON_SECRET = process.env.CRON_SECRET;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'coaching@timkilroy.com';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        const user = (report as { users: { email: string; first_name: string } }).users;
        const viewUrl = `${APP_URL}/dashboard/coaching/${report.id}`;

        let subject: string;
        let body: string;

        const startDate = format(new Date(report.period_start), 'MMM d');
        const endDate = format(new Date(report.period_end), 'MMM d, yyyy');

        switch (report.report_type) {
          case 'weekly':
            subject = 'Your Weekly Sales Coaching is Ready';
            body = `
Hi ${user.first_name || 'there'},

Your coaching session for last week is ready.

I pulled your calls, spotted the patterns, and turned them into a plan.

View Your Coaching for ${startDate} - ${endDate}:
${viewUrl}

Go get better this week.

- Your WTF Coach
            `.trim();
            break;

          case 'monthly':
            const month = format(new Date(report.period_start), 'MMMM yyyy');
            subject = `${month} Sales Performance - Your Monthly Coaching Summary`;
            body = `
Hi ${user.first_name || 'there'},

Your monthly coaching report is live.

It pulls together your weekly cycles to show the bigger picture.
Strengths. Drifts. Patterns that matter.

Read Your ${month} Report:
${viewUrl}

Take a few minutes with this one.

- Your WTF Coach
            `.trim();
            break;

          case 'quarterly':
            const quarter = `Q${Math.ceil((new Date(report.period_start).getMonth() + 1) / 3)} ${format(new Date(report.period_start), 'yyyy')}`;
            subject = `${quarter} Sales Performance - Time for the Big View`;
            body = `
Hi ${user.first_name || 'there'},

Quarterly coaching is ready.

This is the long-view narrative of where you're improving and where you need to dig in.
Take a moment with it.

View Your ${quarter} Report:
${viewUrl}

The trajectory matters more than any single call.

- Your WTF Coach
            `.trim();
            break;

          default:
            continue;
        }

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: `WTF Sales Coach <${FROM_EMAIL}>`,
          to: user.email,
          subject,
          text: body,
        });

        if (emailError) {
          throw new Error(emailError.message);
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
