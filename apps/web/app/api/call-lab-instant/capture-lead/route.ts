import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@repo/db/client';
import {
  getInstantReportById,
  updateInstantReportEmail,
  findOrCreateInstantLead,
  updateLeadWelcomeSent,
} from '@repo/db';

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
    const { lead, isNew } = await findOrCreateInstantLead(supabase, {
      email,
      first_name: firstName,
      first_report_id: reportId,
    });

    // Generate URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const reportUrl = `${appUrl}/call-lab-instant/report/${reportId}`;
    const wtfGuideUrl = `${appUrl}/wtf-sales-guide`;
    const upgradeUrl = `${appUrl}/call-lab-pro`;

    // Send welcome email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'Call Lab <calllab@timkilroy.com>';

    if (resendKey) {
      try {
        const resend = new Resend(resendKey);

        // Parse analysis for email
        const analysis = report.analysis as {
          summary?: string;
          what_worked?: string[];
          what_to_watch?: string[];
          one_move?: string;
        };

        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: `Your Call Lab Report (Score: ${report.score}/10) + WTF Sales Guide`,
          html: generateWelcomeEmail({
            firstName: firstName || 'there',
            score: report.score,
            summary: analysis?.summary || '',
            reportUrl,
            wtfGuideUrl,
            upgradeUrl,
          }),
        });

        // Update lead welcome sent timestamp
        await updateLeadWelcomeSent(supabase, email);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }

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

interface WelcomeEmailParams {
  firstName: string;
  score: number;
  summary: string;
  reportUrl: string;
  wtfGuideUrl: string;
  upgradeUrl: string;
}

function generateWelcomeEmail(params: WelcomeEmailParams): string {
  const { firstName, score, summary, reportUrl, wtfGuideUrl, upgradeUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Call Lab Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 30px; border-bottom: 2px solid #E51B23;">
              <span style="font-size: 24px; font-weight: bold; color: #FFFFFF; letter-spacing: 2px;">
                CALL<span style="color: #E51B23;">LAB</span>
              </span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 0;">
              <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 20px 0;">
                Hey ${firstName}!
              </h1>

              <p style="color: #CCCCCC; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thanks for trying Call Lab Instant. Here's your pitch analysis:
              </p>

              <!-- Score Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #E51B23; padding: 20px; text-align: center;">
                    <span style="color: #FFFFFF; font-size: 48px; font-weight: bold;">${score}</span>
                    <span style="color: #FFFFFF; font-size: 24px;">/10</span>
                    <p style="color: #FFFFFF; font-size: 14px; margin: 10px 0 0 0; opacity: 0.9;">
                      ${summary}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 40px;">
                <tr>
                  <td align="center">
                    <a href="${reportUrl}" style="display: inline-block; background-color: #FFDE59; color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 32px; text-transform: uppercase; letter-spacing: 1px;">
                      View Full Report
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <tr>
                <td style="border-top: 1px solid #333333; padding-top: 30px;">
                  <h2 style="color: #FFDE59; font-size: 20px; margin: 0 0 15px 0;">
                    BONUS: The WTF Sales Guide
                  </h2>
                  <p style="color: #CCCCCC; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Learn the 3-pillar framework for trust-based selling that makes every other sales methodology actually work.
                  </p>
                  <a href="${wtfGuideUrl}" style="color: #E51B23; font-size: 16px; text-decoration: none; font-weight: bold;">
                    Read the WTF Sales Guide &rarr;
                  </a>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Upgrade CTA -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; border-left: 4px solid #E51B23;">
              <h3 style="color: #FFFFFF; font-size: 18px; margin: 0 0 10px 0;">
                Want to track your progress over time?
              </h3>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Call Lab Pro gives you unlimited analysis, pattern tracking, and personalized coaching based on YOUR actual calls.
              </p>
              <a href="${upgradeUrl}" style="color: #FFDE59; font-size: 14px; text-decoration: none; font-weight: bold;">
                Learn about Call Lab Pro &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 0 0 0; border-top: 1px solid #333333; margin-top: 40px;">
              <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0;">
                You're receiving this because you used Call Lab Instant.<br>
                Tim Kilroy &bull; Agency Sales Coach<br>
                <a href="https://timkilroy.com" style="color: #666666;">timkilroy.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
