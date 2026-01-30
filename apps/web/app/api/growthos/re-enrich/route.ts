import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateAssessment } from '@repo/utils/src/assessment/scoring';
import { runEnrichmentPipeline } from '@repo/utils/src/assessment/enrichment';
import { calculateRevelations } from '@repo/utils/src/assessment/revelations';
import type { IntakeData } from '@repo/utils/src/assessment/scoring';
import type { RevelationIntakeData } from '@repo/utils/src/assessment/revelations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authClient = createServerComponentClient({ cookies });
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assessmentId } = body as { assessmentId: string };

    if (!assessmentId) {
      return NextResponse.json(
        { success: false, message: 'Missing assessmentId' },
        { status: 400 }
      );
    }

    // Fetch existing assessment (must belong to this user)
    const { data: assessment, error: fetchError } = await supabase
      .from('assessments')
      .select('id, intake_data, scores, user_id')
      .eq('id', assessmentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !assessment) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found' },
        { status: 404 }
      );
    }

    const intakeData = assessment.intake_data as IntakeData;

    // Re-run enrichment pipeline
    let enrichmentData = null;
    try {
      enrichmentData = await runEnrichmentPipeline(intakeData);
    } catch (enrichError: any) {
      console.error('[GrowthOS] Re-enrichment failed:', enrichError.message);
      return NextResponse.json(
        { success: false, message: 'Enrichment pipeline failed: ' + enrichError.message },
        { status: 500 }
      );
    }

    // Re-run scoring engine
    const scores = calculateAssessment(intakeData);

    // Re-run revelations with enrichment data
    try {
      const revelationData = intakeData as unknown as RevelationIntakeData;
      const revelations = calculateRevelations(revelationData, enrichmentData);
      (scores as any).revelations = revelations;
    } catch (revError: any) {
      console.error('[GrowthOS] Revelations re-calculation failed:', revError.message);
    }

    // Update assessment with new enrichment + scores
    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        scores,
        enrichment_data: enrichmentData,
        overall_score: scores.overall,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId);

    if (updateError) {
      console.error('[GrowthOS] Failed to update assessment:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to save re-enriched results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        assessmentId,
        scores,
        enrichment: enrichmentData ? {
          hasApify: !!enrichmentData.apify.website,
          hasExa: enrichmentData.exa.icpProblems.length > 0 || !!enrichmentData.exa.competitors,
          hasLLM: !!enrichmentData.llmAwareness,
          hasAnalysis: !!enrichmentData.analysis,
          errors: enrichmentData.meta.errors.length
        } : null
      }
    });

  } catch (error: any) {
    console.error('[GrowthOS] Re-enrichment error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Re-enrichment failed' },
      { status: 500 }
    );
  }
}
