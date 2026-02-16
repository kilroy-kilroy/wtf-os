import { NextRequest, NextResponse } from 'next/server';
import { VisibilityLabProInput, VisibilityLabProReport } from '@/lib/visibility-lab-pro/types';
import { buildVisibilityLabProPrompt } from '@repo/prompts';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onVisibilityProReportGenerated } from '@/lib/loops';
import { addVisibilityLabSubscriber } from '@/lib/beehiiv';
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const input: VisibilityLabProInput = await request.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = buildVisibilityLabProPrompt(input);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'user', content: systemPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate Pro analysis' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json(
        { error: 'No response from Visibility Lab Pro engine' },
        { status: 500 }
      );
    }

    // Clean potential Markdown formatting and extract JSON
    let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Try to extract JSON object if there's surrounding text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    try {
      const report = JSON.parse(cleanedText) as VisibilityLabProReport;

      // Save to database (non-blocking)
      const supabase = getSupabaseServerClient();
      let reportId: string | null = null;

      // Look up user by email to attach report to profile
      let userId: string | null = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(input.userEmail);
        userId = authUser?.user?.id || null;
      } catch {
        // User may not exist — that's fine
      }

      try {
        const { data: savedReport, error: saveError } = await supabase
          .from('visibility_lab_reports')
          .insert({
            user_id: userId,
            email: input.userEmail,
            brand_name: report.brandName,
            visibility_score: report.kvi?.compositeScore || null,
            vvv_clarity_score: report.narrativeForensics?.overallConsistencyScore || null,
            brand_archetype_name: report.brandArchetype?.name || null,
            brand_archetype_reasoning: report.brandArchetype?.reasoning || null,
            full_report: report,
            input_data: input,
          })
          .select('id')
          .single();

        if (saveError) {
          console.error('Failed to save visibility pro report:', saveError);
        } else {
          reportId = savedReport?.id || null;
        }
      } catch (saveErr) {
        console.error('DB save error (non-blocking):', saveErr);
      }

      // Add to Beehiiv newsletter (fire-and-forget)
      addVisibilityLabSubscriber(input.userEmail, input.userName, input.brandName).catch(err => {
        console.error('Beehiiv visibility lab pro subscriber failed:', err);
      });

      // Fire Loops event (fire-and-forget)
      if (reportId) {
        let archetype = '';
        let executionScore = 0;
        let positioningScore = 0;

        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('id')
            .eq('email', input.userEmail)
            .single();
          if (userRecord?.id) {
            const quadrant = await getArchetypeForLoops(supabase, userRecord.id);
            archetype = quadrant.archetype;
            executionScore = quadrant.executionScore;
            positioningScore = quadrant.positioningScore;
          }
        } catch (err) {
          console.error('Failed to compute archetype for Visibility Pro Loops:', err);
        }

        onVisibilityProReportGenerated(
          input.userEmail,
          reportId,
          report.kvi?.compositeScore || 0,
          report.brandName,
          report.diagnosisSeverity,
          report.brandArchetype?.name,
          archetype,
          executionScore,
          positioningScore
        ).catch(err => {
          console.error('Failed to send Visibility Lab Pro Loops event:', err);
        });
      }

      return NextResponse.json({ ...report, reportId });
    } catch {
      console.error("Failed to parse JSON. Raw text:", text.substring(0, 500));

      // Only flag as safety filter if the AI explicitly refused the request
      const lowerText = text.toLowerCase();
      const isRefusal = (
        (lowerText.includes("i'm sorry") || lowerText.includes("i cannot") || lowerText.includes("i can't")) &&
        (lowerText.includes("assist") || lowerText.includes("provide") || lowerText.includes("generate") || lowerText.includes("help"))
      );

      if (isRefusal) {
        return NextResponse.json(
          { error: 'AI Safety Filter Triggered. Please try again with different inputs.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Analysis failed: AI returned invalid data. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Visibility Lab Pro Analysis Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
