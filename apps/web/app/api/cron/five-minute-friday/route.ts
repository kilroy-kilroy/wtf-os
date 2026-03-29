import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { sendEvent } from '@/lib/loops';

/**
 * Cron: 5-Minute Friday Reminder
 *
 * Runs every Friday morning. Sends reminder emails to all clients
 * enrolled in programs with 5-Minute Friday enabled, who haven't
 * yet submitted for this week.
 *
 * Respects client timezone - sends at ~9 AM in their local time.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get current date and figure out this week's Friday
    const now = new Date();
    const dayOfWeek = now.getUTCDay();

    // Only send on Fridays (day 5)
    // But cron might run slightly before/after midnight UTC
    // Accept Thursday-Saturday window to handle timezone offsets
    if (dayOfWeek < 4 || dayOfWeek > 6) {
      return NextResponse.json({
        message: 'Not Friday (or close to Friday). Skipping.',
        dayOfWeek,
      });
    }

    // Calculate this Friday's date
    const friday = new Date(now);
    if (dayOfWeek === 4) friday.setDate(friday.getDate() + 1); // Thursday -> Friday
    if (dayOfWeek === 6) friday.setDate(friday.getDate() - 1); // Saturday -> Friday
    const fridayStr = friday.toISOString().split('T')[0];

    // Get all active enrollments and programs separately to avoid PostgREST join issues
    const [enrollmentsResult, programsResult] = await Promise.all([
      supabase
        .from('client_enrollments')
        .select('id, user_id, program_id, timezone')
        .eq('status', 'active')
        .eq('onboarding_completed', true),
      supabase
        .from('client_programs')
        .select('id, name, has_five_minute_friday')
        .eq('has_five_minute_friday', true),
    ]);

    const enrollments = enrollmentsResult.data || [];
    const fmfProgramIds = new Set((programsResult.data || []).map(p => p.id));
    const programMap = new Map((programsResult.data || []).map(p => [p.id, p]));

    if (enrollments.length === 0) {
      return NextResponse.json({ message: 'No enrollments found', sent: 0 });
    }

    // Filter to only 5MF programs
    const fmfEnrollments = enrollments.filter(e => fmfProgramIds.has(e.program_id));

    let sent = 0;
    let skipped = 0;

    for (const enrollment of fmfEnrollments) {
      const program = programMap.get(enrollment.program_id);

      // Check timezone - should we send now?
      // Simple approach: check if it's between 8 AM and 11 AM in their timezone
      try {
        const clientTime = new Date(now.toLocaleString('en-US', { timeZone: enrollment.timezone || 'America/New_York' }));
        const clientHour = clientTime.getHours();

        // Only send between 7 AM - 12 PM in client's timezone
        if (clientHour < 7 || clientHour > 12) {
          skipped++;
          continue;
        }
      } catch {
        // If timezone is invalid, just send anyway
      }

      // Check if they already submitted this week
      const { data: existing } = await supabase
        .from('five_minute_fridays')
        .select('id')
        .eq('user_id', enrollment.user_id)
        .eq('week_of', fridayStr)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(enrollment.user_id);
      if (!userData?.user?.email) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      const firstName = userData.user.user_metadata?.full_name?.split(' ')[0] || 'there';

      // Send reminder via Loops
      await sendEvent({
        email: userData.user.email,
        eventName: 'five_minute_friday_reminder',
        eventProperties: {
          firstName,
          programName: program?.name || '',
          submitUrl: `${appUrl}/client/five-minute-friday`,
          weekOf: fridayStr,
        },
      });

      sent++;
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      total_enrollments: fmfEnrollments.length,
      friday_date: fridayStr,
    });
  } catch (error) {
    console.error('Friday cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
