import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onVisibilityReportGenerated, onVisibilityProReportGenerated } from '@/lib/loops';
import { addVisibilityLabSubscriber } from '@/lib/beehiiv';
import { copperSyncLead, PRO_ACV, COPPER_STAGES } from '@/lib/copper';
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

    // Sync to Copper CRM as a Visibility Lab Pro lead
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const scorePath = isPro ? 'visibility-lab-pro' : 'visibility-lab';
    const scoreLabel = isPro ? 'Visibility Lab Pro' : 'Visibility Lab Free';
    const scoreValue = isPro
      ? (report.full_report?.kviScore ?? report.visibility_score ?? 0)
      : (report.visibility_score ?? 0);
    let copperResult: { success: boolean; error?: string } = { success: false };
    try {
      await copperSyncLead({
        email,
        name: userName,
        companyName: brandName,
        productName: 'Visibility Lab Pro',
        opportunityValue: PRO_ACV,
        stageId: COPPER_STAGES.LEAD,
        note: `Ran ${scoreLabel} — Score: ${scoreValue}/100. View: ${appUrl}/${scorePath}/report/${report.id}`,
      });
      copperResult = { success: true };
    } catch (err) {
      console.error('[trigger-delivery] copper sync failed:', err);
      copperResult = { success: false, error: err instanceof Error ? err.message : String(err) };
    }

    return NextResponse.json({
      success: true,
      report_id: report.id,
      email,
      version: report.version || 'lite',
      loops: loopsResult,
      beehiiv: beehiivResult,
      copper: copperResult,
    });
  } catch (error) {
    console.error('[trigger-delivery] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
