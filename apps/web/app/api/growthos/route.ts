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
    // Get authenticated user (secure, validates with Supabase Auth server)
    const authClient = createServerComponentClient({ cookies });
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.id;
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

    // Ensure user record exists in users table (GrowthOS skips onboarding)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      const nameParts = (intakeData.founderName || '').split(' ');
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email || intakeData.email,
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null,
          full_name: intakeData.founderName || null,
          subscription_tier: 'lead',
        });

      if (userError) {
        console.error('[GrowthOS] Failed to create user record:', userError);
        return NextResponse.json(
          { success: false, message: 'Failed to create user record' },
          { status: 500 }
        );
      }
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
          hasApify: !!enrichmentData.apify.website,
          hasExa: enrichmentData.exa.icpProblems.length > 0 || !!enrichmentData.exa.competitors,
          hasLLM: !!enrichmentData.llmAwareness,
          hasAnalysis: !!enrichmentData.analysis,
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
