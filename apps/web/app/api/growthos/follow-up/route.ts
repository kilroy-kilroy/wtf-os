import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { generateFollowUpInsights } from '@repo/utils/src/assessment/follow-up';
import type { FollowUpAnswers } from '@repo/utils/src/assessment/follow-up';
import type { IntakeData, AssessmentResult } from '@repo/utils/src/assessment/scoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { assessmentId, answers } = await request.json() as {
      assessmentId: string;
      answers: FollowUpAnswers;
    };

    if (!assessmentId || !answers) {
      return NextResponse.json(
        { success: false, message: 'Missing assessmentId or answers' },
        { status: 400 }
      );
    }

    // Fetch assessment
    const { data: assessment, error: fetchError } = await supabase
      .from('assessments')
      .select('*')
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
    const scores = assessment.scores as AssessmentResult;

    // Generate insights from follow-up answers
    const followUpInsights = generateFollowUpInsights(intakeData, scores, answers);

    // Store answers and insights on the assessment
    const updatedScores = {
      ...scores,
      followUpAnswers: answers,
      followUpInsights,
    };

    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        scores: updatedScores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (updateError) {
      console.error('[GrowthOS] Failed to update follow-up answers:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to save follow-up answers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { followUpInsights },
    });
  } catch (error: any) {
    console.error('[GrowthOS] Follow-up submission error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Follow-up processing failed' },
      { status: 500 }
    );
  }
}
