import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-auth-server';

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { worked_on, working_on_next, concerned_about, happy_about, whats_in_the_way } = body;

    if (!worked_on || !working_on_next) {
      return NextResponse.json({ error: 'worked_on and working_on_next are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get active enrollment with 5MF enabled
    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id, program:client_programs(has_five_minute_friday)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const program = enrollment?.program as any;
    if (!program?.has_five_minute_friday) {
      return NextResponse.json({ error: '5-Minute Friday not available for your program' }, { status: 403 });
    }

    // Calculate the Friday date for this week
    const now = new Date();
    const friday = new Date(now);
    const dayOfWeek = friday.getDay();
    // If it's Saturday (6) or Sunday (0), get next Friday
    // Otherwise get this week's Friday
    if (dayOfWeek === 6) {
      friday.setDate(friday.getDate() + 6);
    } else if (dayOfWeek === 0) {
      friday.setDate(friday.getDate() + 5);
    } else {
      friday.setDate(friday.getDate() + (5 - dayOfWeek));
    }
    const weekOf = friday.toISOString().split('T')[0];

    // Check for duplicate
    const { data: existing } = await supabase
      .from('five_minute_fridays')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_of', weekOf)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already submitted for this week', message: 'You have already submitted your 5-Minute Friday for this week.' }, { status: 409 });
    }

    const { data: friday_record, error } = await supabase
      .from('five_minute_fridays')
      .insert({
        user_id: user.id,
        enrollment_id: enrollment.id,
        week_of: weekOf,
        worked_on,
        working_on_next,
        concerned_about: concerned_about || null,
        happy_about: happy_about || null,
        whats_in_the_way: whats_in_the_way || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Friday submission error:', error);
      return NextResponse.json({ error: 'Failed to submit', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: friday_record.id });
  } catch (error) {
    console.error('5-Minute Friday error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
