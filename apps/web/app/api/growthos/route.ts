import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateAssessment } from '@repo/utils/src/assessment/scoring';
import { runEnrichmentPipeline } from '@repo/utils/src/assessment/enrichment';
import type { IntakeData } from '@repo/utils/src/assessment/scoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const authClient = createServerComponentClient({ cookies });
    const { data: { session } } = await authClient.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { intakeData } = body as { intakeData: IntakeData };

    if (!intakeData) {
      return NextResponse.json(
        { success: false, message: 'Missing intake data' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!intakeData.agencyName || !intakeData.email || !intakeData.website) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: agencyName, email, website' },
        { status: 400 }
      );
    }

    // Create assessment record in pending state
    const { data: assessment, error: insertError } = await supabase
      .from('assessments')
      .insert({
        user_id: userId,
        assessment_type: 'agency',
        version: 'v3',
        intake_data: intakeData,
        status: 'enriching'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[GrowthOS] Failed to create assessment:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to create assessment record' },
        { status: 500 }
      );
    }

    const assessmentId = assessment.id;

    // Run enrichment pipeline (parallel external data collection)
    let enrichmentData = null;
    try {
      enrichmentData = await runEnrichmentPipeline(intakeData);

      await supabase
        .from('assessments')
        .update({
          enrichment_data: enrichmentData,
          status: 'scoring'
        })
        .eq('id', assessmentId);
    } catch (enrichError: any) {
      console.error('[GrowthOS] Enrichment failed (continuing with scoring):', enrichError.message);
      await supabase
        .from('assessments')
        .update({ status: 'scoring' })
        .eq('id', assessmentId);
    }

    // Run scoring engine
    const scores = calculateAssessment(intakeData);

    // Update assessment with results
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
    }

    return NextResponse.json({
      success: true,
      data: {
        assessmentId,
        scores,
        enrichment: enrichmentData ? {
          hasApify: !!(enrichmentData.apify.homepage || enrichmentData.apify.caseStudies),
          hasExa: !!(enrichmentData.exa.visibility || enrichmentData.exa.authority),
          hasLLM: !!enrichmentData.llmAwareness,
          errors: enrichmentData.meta.errors.length
        } : null
      }
    });

  } catch (error: any) {
    console.error('[GrowthOS] Assessment submission error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Assessment processing failed' },
      { status: 500 }
    );
  }
}
