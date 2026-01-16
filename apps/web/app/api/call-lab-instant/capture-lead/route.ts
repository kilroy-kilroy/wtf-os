import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  getInstantReportById,
  updateInstantReportEmail,
  findOrCreateInstantLead,
  updateLeadWelcomeSent,
  updateLeadBeehiivSync,
} from '@repo/db';
import { sendEvent } from '@/lib/loops';
import { addCallLabSubscriber } from '@/lib/beehiiv';
import { trackEmailCaptured, trackReportGenerated } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, reportId, firstName } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Validate reportId
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify report exists
    const report = await getInstantReportById(supabase, reportId);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Update report with email
    await updateInstantReportEmail(supabase, reportId, email);

    // Create or find lead
    const { isNew } = await findOrCreateInstantLead(supabase, {
      email,
      first_name: firstName,
      first_report_id: reportId,
    });

    // Track email capture in Vercel Analytics
    await trackEmailCaptured({
      source: 'call-lab-instant',
      isNewLead: isNew,
      hasName: !!firstName,
    });

    // Add to Beehiiv newsletter (fire-and-forget, update DB on success)
    addCallLabSubscriber(email, firstName)
      .then((result) => {
        if (result.success && result.id) {
          updateLeadBeehiivSync(supabase, email, result.id).catch(() => {});
        }
      })
      .catch((err) => console.error('Beehiiv subscriber add failed:', err));

    // Generate URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const reportUrl = `${appUrl}/call-lab-instant/report/${reportId}`;

    // Send event to Loops to trigger email sequence
    await sendEvent({
      email: email.toLowerCase().trim(),
      eventName: 'call_lab_instant_report',
      eventProperties: {
        firstName: firstName || '',
        score: report.score || 0,
        reportId,
        reportUrl,
        scenario: report.scenario_type || '',
        isNewLead: isNew,
      },
    }).then(() => {
      // Update lead welcome sent timestamp on success
      updateLeadWelcomeSent(supabase, email).catch(() => {});
    }).catch(err => {
      console.error('Loops event error:', err);
    });

    return NextResponse.json({
      success: true,
      reportUrl,
      isNewLead: isNew,
    });
  } catch (error) {
    console.error('Capture lead error:', error);

    return NextResponse.json(
      {
        error: 'Failed to save email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
