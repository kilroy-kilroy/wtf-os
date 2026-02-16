import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { alertClientInactive, alertFridayOverdue } from '@/lib/slack';

export const runtime = 'nodejs';

/**
 * Daily admin digest cron
 *
 * Checks for:
 * 1. Clients inactive for 7+ days (based on last_sign_in_at)
 * 2. Unanswered Friday check-ins (no response row)
 *
 * Runs daily at 9am ET via Vercel Cron
 */
export async function GET(request: NextRequest) {
  // Verify cron auth (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  try {
    // 1. Find inactive clients (7+ days since last login)
    const { data: enrollments } = await supabase
      .from('client_enrollments')
      .select('user_id, status')
      .eq('status', 'active');

    let inactiveCount = 0;

    if (enrollments && enrollments.length > 0) {
      // Get auth user data for last_sign_in_at and email/name
      const { data: authData } = await supabase.auth.admin.listUsers();
      const authUserMap = new Map<string, { lastSignIn: string | null; email: string; name: string | null }>();
      for (const u of authData?.users || []) {
        authUserMap.set(u.id, {
          lastSignIn: u.last_sign_in_at || null,
          email: u.email || '',
          name: u.user_metadata?.full_name || null,
        });
      }

      const now = new Date();
      for (const enrollment of enrollments) {
        if (!enrollment.user_id) continue;
        const authUser = authUserMap.get(enrollment.user_id);
        if (!authUser?.lastSignIn) continue; // Never logged in — handled by invite flow

        const lastLogin = new Date(authUser.lastSignIn);
        const daysSince = Math.floor(
          (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince >= 7) {
          alertClientInactive(
            authUser.name || authUser.email || 'Unknown',
            daysSince
          );
          inactiveCount++;
        }
      }
    }

    // 2. Count unanswered Friday check-ins
    // Fetch recent fridays and all responses, diff in JS
    const { data: allFridays } = await supabase
      .from('five_minute_fridays')
      .select('id')
      .order('submitted_at', { ascending: false })
      .limit(50);

    const { data: allResponses } = await supabase
      .from('five_minute_friday_responses')
      .select('friday_id');

    const respondedIds = new Set(
      (allResponses || []).map((r: any) => r.friday_id)
    );
    const unansweredFridays = (allFridays || []).filter(
      (f: any) => !respondedIds.has(f.id)
    );

    alertFridayOverdue(unansweredFridays.length);

    return NextResponse.json({
      success: true,
      checked: {
        enrollments: enrollments?.length || 0,
        inactiveClients: inactiveCount,
        unansweredFridays: unansweredFridays.length,
      },
    });
  } catch (error) {
    console.error('[Admin Digest] Cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
