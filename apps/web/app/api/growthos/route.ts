import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateAssessment } from '@repo/utils/src/assessment/scoring';
import { runEnrichmentPipeline } from '@repo/utils/src/assessment/enrichment';
import { calculateRevelations } from '@repo/utils/src/assessment/revelations';
import { generateDiagnoses } from '@repo/utils/src/assessment/diagnosis';
import type { IntakeData } from '@repo/utils/src/assessment/scoring';
import type { RevelationIntakeData } from '@repo/utils/src/assessment/revelations';
import { addAssessmentSubscriber } from '@/lib/beehiiv';

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

    // Ensure user + org records exist, populated from assessment intake data.
    // This unifies the data stack so assessment users don't repeat onboarding.
    const PUBLIC_EMAIL_DOMAINS = [
      'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
      'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com',
      'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
      'protonmail.com', 'proton.me', 'zoho.com', 'mail.com',
      'gmx.com', 'yandex.com', 'fastmail.com'
    ];

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, org_id, onboarding_completed')
      .eq('id', userId)
      .single();

    const nameParts = (intakeData.founderName || '').split(' ');
    const userEmail = user.email || intakeData.email;
    const domain = userEmail.split('@')[1]?.toLowerCase();
    const isPublicDomain = domain ? PUBLIC_EMAIL_DOMAINS.includes(domain) : true;

    // Map assessment teamSize to company size range
    const teamSize = intakeData.teamSize;
    let companySizeEstimate = '';
    if (teamSize !== undefined && teamSize !== null) {
      const ts = Number(teamSize);
      if (ts <= 1) companySizeEstimate = '1';
      else if (ts <= 5) companySizeEstimate = '2-5';
      else if (ts <= 10) companySizeEstimate = '6-10';
      else if (ts <= 25) companySizeEstimate = '11-25';
      else if (ts <= 50) companySizeEstimate = '26-50';
      else if (ts <= 100) companySizeEstimate = '51-100';
      else companySizeEstimate = '100+';
    }

    // Map assessment revenue to revenue range
    let revenueEstimate = '';
    const rev = Number(intakeData.lastYearRevenue || (intakeData.lastMonthRevenue ? Number(intakeData.lastMonthRevenue) * 12 : 0));
    if (rev > 0) {
      if (rev < 100000) revenueEstimate = '$0 - $100K';
      else if (rev < 500000) revenueEstimate = '$100K - $500K';
      else if (rev < 1000000) revenueEstimate = '$500K - $1M';
      else if (rev < 5000000) revenueEstimate = '$1M - $5M';
      else if (rev < 10000000) revenueEstimate = '$5M - $10M';
      else revenueEstimate = '$10M+';
    }

    let orgId: string | null = existingUser?.org_id || null;

    // Create or find org if user doesn't have one yet
    if (!orgId && intakeData.agencyName) {
      if (!isPublicDomain && domain) {
        // Check for existing org on this domain
        const { data: existingOrg } = await supabase
          .from('orgs')
          .select('id')
          .eq('primary_domain', domain)
          .single();

        if (existingOrg) {
          orgId = existingOrg.id;
        } else {
          const { data: newOrg, error: orgError } = await supabase
            .from('orgs')
            .insert({
              name: intakeData.agencyName,
              primary_domain: domain,
              company_size: companySizeEstimate || null,
              company_revenue: revenueEstimate || null,
              personal: false,
              mode: (teamSize && Number(teamSize) > 1) ? 'team' : 'solo',
              created_by_user_id: userId,
            })
            .select('id')
            .single();

          if (!orgError && newOrg) orgId = newOrg.id;
        }
      } else {
        // Personal workspace
        const { data: newOrg, error: orgError } = await supabase
          .from('orgs')
          .insert({
            name: intakeData.agencyName,
            company_size: companySizeEstimate || null,
            company_revenue: revenueEstimate || null,
            personal: true,
            mode: 'solo',
            created_by_user_id: userId,
          })
          .select('id')
          .single();

        if (!orgError && newOrg) orgId = newOrg.id;
      }
    }

    // Upsert user record with assessment data and mark onboarding complete
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userEmail,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
        full_name: intakeData.founderName || null,
        subscription_tier: existingUser ? undefined : 'lead',
        org_id: orgId,
        is_org_owner: orgId && !existingUser?.org_id ? true : undefined,
        onboarding_completed: true,
      });

    if (userError) {
      console.error('[GrowthOS] Failed to upsert user record:', userError);
      return NextResponse.json(
        { success: false, message: 'Failed to create user record' },
        { status: 500 }
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

    // Run revelations engine (calculated data for heatmap/fallback)
    try {
      const revelationData = intakeData as unknown as RevelationIntakeData;
      const revelations = calculateRevelations(revelationData, enrichmentData);
      (scores as any).revelations = revelations;
    } catch (revError: any) {
      console.error('[GrowthOS] Revelations calculation failed (continuing):', revError.message);
    }

    // Run Claude diagnosis engine (generates actual written diagnoses)
    try {
      const diagnoses = await generateDiagnoses(intakeData, enrichmentData, scores);
      (scores as any).diagnoses = diagnoses;
    } catch (diagError: any) {
      console.error('[GrowthOS] Diagnosis generation failed (continuing):', diagError.message);
    }

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

    // Add to Agency Inner Circle newsletter list (fire-and-forget)
    addAssessmentSubscriber(
      intakeData.email,
      intakeData.founderName,
      intakeData.agencyName
    ).catch((err) => {
      console.error('[GrowthOS] Beehiiv subscription failed:', err);
    });

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
