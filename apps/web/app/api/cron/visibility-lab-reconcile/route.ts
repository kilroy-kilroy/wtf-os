import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onVisibilityReportGenerated } from '@/lib/loops';
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

/**
 * Cron: Reconcile visibility_lab_reports with loops_events.
 *
 * Scans recent visibility reports (last 7 days) and re-fires the
 * visibility_report_generated Loops event for any that don't have
 * a matching loops_events audit row — this catches silent delivery
 * failures.
 *
 * Runs daily via vercel.json cron config.
 */
export async function GET(request: NextRequest) {
  // Lenient auth: if CRON_SECRET is set, require it; otherwise allow
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get recent visibility reports that have an email
  const { data: reports, error: reportsErr } = await (supabase as any)
    .from('visibility_lab_reports')
    .select('id, email, user_id, brand_name, visibility_score, created_at')
    .gte('created_at', sevenDaysAgo)
    .not('email', 'is', null);

  if (reportsErr) {
    console.error('[reconcile] Failed to fetch reports:', reportsErr);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }

  if (!reports || reports.length === 0) {
    return NextResponse.json({ checked: 0, resent: 0 });
  }

  // Get matching loops_events for these emails
  const emails = [...new Set(reports.map((r: any) => r.email))];
  const { data: events } = await (supabase as any)
    .from('loops_events')
    .select('user_email, event_data')
    .eq('event_name', 'visibility_report_generated')
    .in('user_email', emails);

  // Build a set of delivered report IDs from the event_data
  const deliveredReportIds = new Set<string>();
  for (const e of (events || [])) {
    const reportId = e.event_data?.reportId;
    if (reportId) deliveredReportIds.add(reportId);
  }

  // Find reports that weren't delivered
  const missing = reports.filter((r: any) => !deliveredReportIds.has(r.id));

  const resent: Array<{ id: string; email: string; success: boolean; error?: string }> = [];
  for (const report of missing) {
    let archetype = '';
    let executionScore = 0;
    let positioningScore = 0;
    if (report.user_id) {
      try {
        const quadrant = await getArchetypeForLoops(supabase, report.user_id);
        archetype = quadrant.archetype;
        executionScore = quadrant.executionScore;
        positioningScore = quadrant.positioningScore;
      } catch {
        // ignore, send with empty archetype
      }
    }

    const result = await onVisibilityReportGenerated(
      report.email,
      report.id,
      report.visibility_score || 0,
      report.brand_name || '',
      archetype,
      executionScore,
      positioningScore
    );
    resent.push({
      id: report.id,
      email: report.email,
      success: result.success,
      error: result.error,
    });
  }

  return NextResponse.json({
    checked: reports.length,
    missing: missing.length,
    resent: resent.filter((r) => r.success).length,
    failed: resent.filter((r) => !r.success).length,
    details: resent,
  });
}
