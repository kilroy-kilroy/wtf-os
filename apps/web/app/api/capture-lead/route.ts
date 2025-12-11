import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Optional: Send to ConvertKit if configured
    const convertKitApiKey = process.env.CONVERTKIT_API_KEY;
    const convertKitFormId = process.env.CONVERTKIT_QUICK_ANALYZE_FORM_ID;

    if (convertKitApiKey && convertKitFormId) {
      try {
        await fetch(`https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: convertKitApiKey,
            email: email.toLowerCase().trim(),
            tags: ['quick-analyze-lead'],
            fields: {
              source: source || 'quick-analyze',
              pitch_score: score?.toString() || '',
            }
          }),
        });
      } catch (convertKitError) {
        // Don't fail if ConvertKit fails
        console.error('ConvertKit error:', convertKitError);
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
