import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Lazy-initialize clients to avoid build-time errors when env vars aren't available
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface SupportRequest {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

/**
 * POST /api/support
 *
 * Handles support form submissions:
 * 1. Validates the request
 * 2. Sends email notification to support team
 * 3. Sends confirmation email to user
 * 4. Optionally stores in database
 */
export async function POST(request: Request) {
  try {
    const body: SupportRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format (using non-backtracking pattern to avoid ReDoS)
    if (!body.email.includes('@') || body.email.length > 254) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const categoryLabels: Record<string, string> = {
      general: 'General Question',
      billing: 'Billing & Subscription',
      technical: 'Technical Issue',
      integration: 'Integration Help',
      feature: 'Feature Request',
    };

    // Send notification to support team
    const resend = getResend();
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@timkilroy.com';

    try {
      await resend.emails.send({
        from: 'Call Lab Pro Support <support@timkilroy.com>',
        to: supportEmail,
        replyTo: body.email,
        subject: `[${ticketId}] ${categoryLabels[body.category] || body.category}: ${body.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #E51B23;">New Support Request</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Ticket ID:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">From:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${body.name} &lt;${body.email}&gt;</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${categoryLabels[body.category] || body.category}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${body.subject}</td>
              </tr>
            </table>
            <h3 style="color: #333;">Message:</h3>
            <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; white-space: pre-wrap;">${body.message}</div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Reply directly to this email to respond to the customer.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[Support] Failed to send notification email:', emailError);
      // Continue even if email fails - we'll still store the ticket
    }

    // Send confirmation to user
    try {
      await resend.emails.send({
        from: 'Call Lab Pro <support@timkilroy.com>',
        to: body.email,
        subject: `We received your request [${ticketId}]`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FFDE59;">Thanks for reaching out!</h2>
            <p>Hi ${body.name},</p>
            <p>We've received your support request and will get back to you within 24-48 hours.</p>
            <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
              <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${body.subject}</p>
              <p style="margin: 0;"><strong>Category:</strong> ${categoryLabels[body.category] || body.category}</p>
            </div>
            <p>If you need to add more information, just reply to this email.</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Best,<br/>
              The Call Lab Pro Team
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[Support] Failed to send confirmation email:', emailError);
      // Continue even if confirmation email fails
    }

    // Store in database (optional - create table if needed)
    try {
      // Check if support_tickets table exists by attempting insert
      // If it fails, we just log and continue
      await getSupabaseAdmin().from('support_tickets').insert({
        ticket_id: ticketId,
        name: body.name,
        email: body.email,
        category: body.category,
        subject: body.subject,
        message: body.message,
        status: 'open',
        created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      // Table might not exist - that's ok, we sent the emails
      console.log('[Support] Could not store ticket in database:', dbError);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Support request submitted successfully',
    });
  } catch (error) {
    console.error('[Support] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit support request' },
      { status: 500 }
    );
  }
}
