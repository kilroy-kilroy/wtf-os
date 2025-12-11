import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, source, transcript, score } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check for Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      // Still return success - don't block the user experience
      return NextResponse.json({ success: true, stored: false });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Store lead in database
    const leadData = {
      email: email.toLowerCase().trim(),
      source: source || 'quick-analyze',
      transcript: transcript || null,
      score: typeof score === 'number' ? score : null,
      created_at: new Date().toISOString(),
      metadata: {
        user_agent: request.headers.get('user-agent') || null,
        referer: request.headers.get('referer') || null,
      }
    };

    const { error: insertError } = await supabase
      .from('quick_analyze_leads')
      .insert(leadData);

    if (insertError) {
      // If table doesn't exist, log but don't fail
      if (insertError.code === '42P01') {
        console.warn('quick_analyze_leads table does not exist. Run the migration.');
        return NextResponse.json({ success: true, stored: false, message: 'Lead captured (table pending)' });
      }

      // For duplicate emails, still return success
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, stored: true, message: 'Email already registered' });
      }

      console.error('Error inserting lead:', insertError);
      return NextResponse.json({ success: true, stored: false });
    }

    // Send welcome email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'tim@timkilroy.com';

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        await resend.emails.send({
          from: fromEmail,
          to: email.toLowerCase().trim(),
          subject: 'Your Call Lab Instant Results + What\'s Next',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #E51B23;">Thanks for trying Call Lab Instant!</h1>

              <p>You scored <strong>${score || 'N/A'}/10</strong> on your pitch analysis.</p>

              <p>Here's the thing: a 30-second pitch is just the tip of the iceberg. Real sales calls have:</p>
              <ul>
                <li>Discovery phases where deals are won or lost</li>
                <li>Objection handling moments that reveal your instincts</li>
                <li>Close attempts that show your confidence level</li>
                <li>Pattern behaviors you can't see in yourself</li>
              </ul>

              <p><strong>Call Lab Pro</strong> analyzes your full sales calls and shows you exactly where deals slip away - and how to fix it.</p>

              <p style="margin: 30px 0;">
                <a href="https://app.timkilroy.com/call-lab-pro"
                   style="background: #E51B23; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold;">
                  See What Call Lab Pro Reveals
                </a>
              </p>

              <p style="color: #666; font-size: 14px;">
                - Tim Kilroy<br>
                <em>Founder, WTF Method</em>
              </p>
            </div>
          `,
        });
      } catch (resendError) {
        // Don't fail if email fails
        console.error('Resend email error:', resendError);
      }
    }

    return NextResponse.json({ success: true, stored: true });
  } catch (error) {
    console.error('Capture lead error:', error);
    return NextResponse.json(
      { error: 'Failed to capture lead' },
      { status: 500 }
    );
  }
}
