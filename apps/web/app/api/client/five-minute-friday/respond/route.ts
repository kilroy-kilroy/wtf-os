import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { sendEvent } from '@/lib/loops';

// Admin-only endpoint for responding to 5-Minute Fridays
export async function POST(request: NextRequest) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friday_id, response_text, responder_id } = await request.json();

    if (!friday_id || !response_text) {
      return NextResponse.json({ error: 'friday_id and response_text are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get the friday submission with user info
    const { data: friday } = await supabase
      .from('five_minute_fridays')
      .select('id, user_id, week_of')
      .eq('id', friday_id)
      .single();

    if (!friday) {
      return NextResponse.json({ error: 'Friday submission not found' }, { status: 404 });
    }

    // Get user email for notification
    const { data: userData } = await supabase.auth.admin.getUserById(friday.user_id);
    const userEmail = userData?.user?.email;

    // Insert response
    const { data: response, error } = await supabase
      .from('five_minute_friday_responses')
      .insert({
        friday_id,
        responder_id: responder_id || null,
        response_text,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save response', message: error.message }, { status: 500 });
    }

    // Send notification email via Loops
    if (userEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      await sendEvent({
        email: userEmail,
        eventName: 'five_minute_friday_response',
        eventProperties: {
          weekOf: friday.week_of,
          responsePreview: response_text.substring(0, 200),
          viewUrl: `${appUrl}/client/five-minute-friday/history`,
        },
      });

      // Mark email as sent
      await supabase
        .from('five_minute_friday_responses')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', response.id);
    }

    return NextResponse.json({ success: true, id: response.id });
  } catch (error) {
    console.error('Friday response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
