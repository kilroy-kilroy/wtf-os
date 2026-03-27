import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-auth-server';
import { sendEvent } from '@/lib/loops';

// Admin-only endpoint for responding to 5-Minute Fridays
export async function POST(request: NextRequest) {
  try {
    // Session-based admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { friday_id, response_text, responder_id } = await request.json();

    if (!friday_id || !response_text) {
      return NextResponse.json({ error: 'friday_id and response_text are required' }, { status: 400 });
    }

    // Use service role client for data queries
    const serviceClient = getSupabaseServerClient();

    // Get the friday submission with user info
    const { data: friday } = await serviceClient
      .from('five_minute_fridays')
      .select('id, user_id, week_of')
      .eq('id', friday_id)
      .single();

    if (!friday) {
      return NextResponse.json({ error: 'Friday submission not found' }, { status: 404 });
    }

    // Get user email for notification
    const { data: userInfo } = await serviceClient.auth.admin.getUserById(friday.user_id);
    const userEmail = userInfo?.user?.email;

    // Insert response
    const { data: response, error } = await serviceClient
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
      await serviceClient
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
