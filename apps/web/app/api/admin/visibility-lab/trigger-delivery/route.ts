import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onVisibilityReportGenerated, onVisibilityProReportGenerated } from '@/lib/loops';
import { addVisibilityLabSubscriber } from '@/lib/beehiiv';
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

// Admin-only: Manually (re)trigger delivery for an existing Visibility Lab report.
// Re-fires the Loops email event and re-adds the user to the Beehiiv list.
// Useful when a user generated a report but was never added to Loops/Beehiiv
// (e.g. the original delivery hooks failed or were skipped).
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await request.json();

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: report, error: reportError } = await (supabase as any)
      .from('visibility_lab_reports')
      .select('id, email, brand_name, visibility_score, version, full_report, input_data')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const email: string | null = report.email;
    if (!email) {
      return NextResponse.json({ error: 'Report has no email on file' }, { status: 400 });
    }

    const brandName: string = report.brand_name || report.full_report?.brandName || '';
    const userName: string | undefined = report.input_data?.userName;

    // Compute archetype / execution / positioning scores for Loops (best effort)
    let archetype = '';
    let executionScore = 0;
    let positioningScore = 0;
    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      if (userRecord?.id) {
        const quadrant = await getArchetypeForLoops(supabase, userRecord.id);
        archetype = quadrant.archetype;
        executionScore = quadrant.executionScore;
        positioningScore = quadrant.positioningScore;
      }
    } catch (err) {
      console.error('[trigger-delivery] archetype lookup failed (non-blocking):', err);
    }

    // Fire Loops event (free vs pro based on stored version)
    const isPro = report.version === 'pro';
    const loopsResult = isPro
      ? await onVisibilityProReportGenerated(
          email,
          report.id,
          report.full_report?.kviScore ?? report.visibility_score ?? 0,
          brandName,
          report.full_report?.diagnosis?.severity || '',
          report.full_report?.brandArchetype?.name || '',
          archetype,
          executionScore,
          positioningScore
        )
      : await onVisibilityReportGenerated(
          email,
          report.id,
          report.visibility_score ?? 0,
          brandName,
          archetype,
          executionScore,
          positioningScore
        );

    // Add to Beehiiv (idempotent - Beehiiv handles existing subscribers)
    const beehiivResult = await addVisibilityLabSubscriber(email, userName, brandName);

    return NextResponse.json({
      success: true,
      report_id: report.id,
      email,
      version: report.version || 'lite',
      loops: loopsResult,
      beehiiv: beehiivResult,
    });
  } catch (error) {
    console.error('[trigger-delivery] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
