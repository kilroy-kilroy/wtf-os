import { NextRequest, NextResponse } from 'next/server';
import { AnalysisInput, AnalysisReport } from '@/lib/visibility-lab/types';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onVisibilityReportGenerated } from '@/lib/loops';
import { addVisibilityLabSubscriber } from '@/lib/beehiiv';
import { getArchetypeForLoops } from '@/lib/growth-quadrant';
import { alertReportGenerated } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    const input: AnalysisInput = await request.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `
    You are the "DemandOS Visibility Engine", an AI analyst modeled after Tim Kilroy's methodology.

    YOUR PERSONALITY:
    - Contrarian truth-teller. No corporate bullshit.
    - Direct, high-energy.
    - You value "Fundamentals First" over shiny tactics.
    - You believe in the "DemandOS" methodology:
      1. **Vibes, Vision, Values (VVV):** Clarity here is the prerequisite to visibility.
      2. **Team Content:** Experts create, Leaders contextualize.
      3. **Repurposing:** One insights becomes a video, a blog, a newsletter, and a tweet.

    YOUR MANDATE - LIVE RESEARCH PHASE (REQUIRED):
    You have access to Google Search. Perform a professional strategic audit.
    1. **Competitor Research:** Search for "${input.mainCompetitors}". What are they posting *right now*? What are their reviews saying? What is their positioning?
    2. **Operator Audit:** Search for "${input.userName}" and "${input.brandName}". Do they exist on LinkedIn? YouTube? Is there recent content?
    3. **Consistency Check:** Compare the user's claimed target audience ("${input.targetAudience}") and current channels ("${input.currentChannels}") against what you actually find on their Website ("${input.website}") and Google. Look for alignment gaps.

    INPUT DATA:
    Operator: ${input.userName}
    Brand: ${input.brandName}
    URL: ${input.website}
    Audience: ${input.targetAudience}
    Competitors: ${input.mainCompetitors}
    Self-Reported Activity: ${input.currentChannels}

    ANALYSIS REQUIREMENTS:
    1.  **Executive Summary:** Brutal honesty based on your search results. Are they an "Order-Taker" or a "Strategic Partner"?
    2.  **Visibility Score:** 0-100 based on signal vs. noise (use search result volume/quality as a proxy).
    3.  **Brand Characterization:**
        In 2-3 words, characterize this brand's current market posture (e.g., "Reactive Generalist", "Invisible Expert", "Passive Broadcaster").
        Provide brief reasoning.

    4.  **VVV Audit & Radar:**
        - Analyze Vibes, Vision, Values.
        - **Vibe Radar:** Score them 1-10 on: Clarity, Consistency, Frequency, Differentiation, Authority.

    5.  **Narrative Dissonance (Truth vs Fiction):**
        - What did they claim in the form vs what did you find?
        - Example: They said "Global Leader" but have 20 LinkedIn followers.
        - Give a Dissonance Score (1-10) and a Label (e.g. "High Dissonance", "Aligned", "Confused").

    6.  **THE DANGER ZONES (Visibility Leaks):**
        - Identify 3 specific places prospects *make decisions* (e.g., YouTube Search, Dark Social/Slack, Review Sites) where this brand is likely invisible.
        - Label the Revenue Risk (Critical/High/Moderate).
    7.  **Core Strengths:** 3-4 "Unfair Advantages" to leverage.
    8.  **Content Gaps:** Topics competitors are missing (based on your search of them), and why THIS brand wins there.
    9.  **Competitor Battlecards:**
        - For each competitor listed, analyze their "Threat Level" (High/Medium/Low) and their specific "Strength" you need to neutralize.
    10. **Channel Strategy (DemandOS Style):**
        - **YouTube:** Not just topics, but how to repurpose.
        - **Team Execution:** Suggest how a subject matter expert vs. the CEO should handle the topic.
    11. **90-Day Plan:** Concrete steps to build the engine.

    IMPORTANT: If you cannot find specific live data, make reasonable strategic inferences based on the industry and the quality of their provided URL. DO NOT REFUSE THE REQUEST.

    OUTPUT FORMAT:
    Return strictly valid JSON. Do not include any conversational text, markdown formatting, or "I'm sorry" messages. Just the JSON.

    Structure:
    {
      "brandName": "string",
      "executiveSummary": "string",
      "visibilityScore": number,
      "brandArchetype": {
        "name": "string",
        "reasoning": "string"
      },
      "vvvAudit": { "vibes": "string", "vision": "string", "values": "string", "clarityScore": number },
      "vibeRadar": [
        { "subject": "Clarity", "A": number (1-10), "fullMark": 10 },
        { "subject": "Consistency", "A": number (1-10), "fullMark": 10 },
        { "subject": "Frequency", "A": number (1-10), "fullMark": 10 },
        { "subject": "Differentiation", "A": number (1-10), "fullMark": 10 },
        { "subject": "Authority", "A": number (1-10), "fullMark": 10 }
      ],
      "narrativeDissonance": {
        "claim": "string (What they said)",
        "reality": "string (What you found)",
        "dissonanceScore": number (1-10),
        "label": "string"
      },
      "coreStrengths": ["string"],
      "visibilityLeaks": [ { "zone": "string", "buyerBehavior": "string", "brandStatus": "string", "revenueRisk": "Critical|High|Moderate" } ],
      "competitors": [ {"name": "string", "positioning": "string", "weakness": "string", "strength": "string", "threatLevel": "High|Medium|Low"} ],
      "contentGaps": [ {"topic": "string", "competitorNeglect": "string", "yourAdvantage": "string", "opportunityScore": 1-5} ],
      "youtubeStrategy": { "channel": "YouTube", "topics": ["string"], "frequency": "string", "teamExecution": "string", "specificTargets": ["string"] },
      "podcastStrategy": { "channel": "Podcast", "topics": ["string"], "frequency": "string", "teamExecution": "string", "specificTargets": ["string"] },
      "eventStrategy": { "channel": "Events", "topics": ["string"], "frequency": "string", "teamExecution": "string", "specificTargets": ["string"] },
      "ninetyDayPlan": [ {"week": "string", "focus": "string", "tasks": ["string"], "impact": "High|Medium|Low"} ]
    }
  `;

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
        { error: 'Failed to generate analysis' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json(
        { error: 'No response from DemandOS Core' },
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
      const report = JSON.parse(cleanedText) as AnalysisReport;

      // Save to database (non-blocking)
      const supabase = getSupabaseServerClient();
      let reportId: string | null = null;

      // Look up user by email to attach report to profile
      let userId: string | null = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(input.userEmail);
        userId = authUser?.user?.id || null;
      } catch {
        // User may not exist — that's fine for lead magnet flows
      }

      try {
        const { data: savedReport, error: saveError } = await supabase
          .from('visibility_lab_reports')
          .insert({
            user_id: userId,
            email: input.userEmail,
            brand_name: report.brandName,
            visibility_score: report.visibilityScore,
            vvv_clarity_score: report.vvvAudit?.clarityScore || null,
            brand_archetype_name: report.brandArchetype?.name || null,
            brand_archetype_reasoning: report.brandArchetype?.reasoning || null,
            full_report: report,
            input_data: input,
          })
          .select('id')
          .single();

        if (saveError) {
          console.error('Failed to save visibility report:', saveError);
        } else {
          reportId = savedReport?.id || null;
        }
      } catch (saveErr) {
        console.error('DB save error (non-blocking):', saveErr);
      }

      // Slack alert
      if (userId) {
        alertReportGenerated(input.userName, 'visibility-free', input.brandName);
      }

      // Add to Beehiiv newsletter (fire-and-forget)
      addVisibilityLabSubscriber(input.userEmail, input.userName, input.brandName).catch(err => {
        console.error('Beehiiv visibility lab subscriber failed:', err);
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
          console.error('Failed to compute archetype for Visibility Loops:', err);
        }

        onVisibilityReportGenerated(
          input.userEmail,
          reportId,
          report.visibilityScore,
          report.brandName,
          archetype,
          executionScore,
          positioningScore
        ).catch(err => {
          console.error('Failed to send Visibility Lab Loops event:', err);
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
          { error: 'AI Safety Filter Triggered. Please try again with a different brand name or less sensitive inputs.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Analysis failed: AI returned invalid data. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('DemandOS Analysis Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
