import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onVisibilityReportGenerated } from '@/lib/loops';
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

/**
 * Admin: Trigger or retry delivery of a visibility lab report via Loops.
 *
 * POST /api/admin/visibility-lab/trigger-delivery
 * Body: { report_id: string }
 * Auth: Bearer ADMIN_API_KEY
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reportId = body.report_id;
  if (!reportId) {
    return NextResponse.json({ error: 'report_id required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: report, error } = await (supabase as any)
    .from('visibility_lab_reports')
    .select('id, email, user_id, brand_name, visibility_score, full_report')
    .eq('id', reportId)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (!report.email) {
    return NextResponse.json({ error: 'Report has no email to deliver to' }, { status: 400 });
  }

  // Compute archetype if user exists
  let archetype = '';
  let executionScore = 0;
  let positioningScore = 0;
  if (report.user_id) {
    try {
      const quadrant = await getArchetypeForLoops(supabase, report.user_id);
      archetype = quadrant.archetype;
      executionScore = quadrant.executionScore;
      positioningScore = quadrant.positioningScore;
    } catch (err) {
      console.error('[trigger-delivery] Failed to compute archetype:', err);
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

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Loops event failed' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email: report.email,
    reportId: report.id,
    brandName: report.brand_name,
  });
}
