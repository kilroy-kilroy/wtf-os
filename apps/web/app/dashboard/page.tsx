import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  NextCallFocus,
  SituationSnapshot,
  PatternIntelligenceGrid,
  MomentumSignals,
  RecentCallsList,
  FollowUpIntelligence,
  CoachingNarrative,
} from "@/components/dashboard";
import {
  MACRO_PATTERNS,
  getPatternById,
  MacroPattern,
} from "@/lib/macro-patterns";

// Types for database results
interface CallScoreRow {
  id: string;
  overall_score: number | null;
  overall_grade: string | null;
  diagnosis_summary: string | null;
  markdown_response: string | null;
  version: string;
  created_at: string;
  ingestion_items: {
    transcript_metadata: Record<string, unknown> | null;
    created_at: string;
  } | null;
}

interface CallSnippetRow {
  id: string;
  call_score_id: string;
  snippet_type: string;
  transcript_quote: string;
  rep_behavior: string | null;
  coaching_note: string | null;
  impact: string | null;
}

interface FollowUpRow {
  id: string;
  call_score_id: string;
  template_type: string;
  subject_line: string | null;
  body: string;
}

// Extract patterns mentioned in markdown response
function extractPatternsFromMarkdown(markdown: string): string[] {
  const patterns: string[] = [];

  // Look for pattern names in "The X" format
  const patternMatches = markdown.match(/\*\*The\s+([^*]+)\*\*/g) || [];
  patternMatches.forEach((match) => {
    const name = match.replace(/\*\*/g, "").trim();
    patterns.push(name);
  });

  // Also look for patterns in section headers
  const headerMatches =
    markdown.match(/###?\s+(?:A\.|B\.|C\.|\d\.)\s*(.+)/g) || [];
  headerMatches.forEach((match) => {
    const name = match.replace(/###?\s+(?:A\.|B\.|C\.|\d\.)\s*/, "").trim();
    if (name.startsWith("The ")) {
      patterns.push(name);
    }
  });

  return [...new Set(patterns)];
}

// Map detected patterns to canonical macro patterns
function mapToCanonicalPatterns(
  detectedPatterns: string[]
): Map<string, number> {
  const patternCounts = new Map<string, number>();

  // Initialize all patterns with 0
  MACRO_PATTERNS.forEach((p) => patternCounts.set(p.id, 0));

  // Map keywords to canonical patterns
  const keywordMapping: Record<string, string> = {
    cultural: "cultural_handshake",
    handshake: "cultural_handshake",
    peer: "peer_validation",
    validation: "peer_validation",
    vulnerability: "vulnerability_flip",
    flip: "vulnerability_flip",
    scenic: "scenic_route",
    route: "scenic_route",
    "small talk": "scenic_route",
    blitzer: "business_blitzer",
    rushed: "business_blitzer",
    diagnostic: "diagnostic_reveal",
    reveal: "diagnostic_reveal",
    "self diagnosis": "self_diagnosis_pull",
    "diagnosis pull": "self_diagnosis_pull",
    generous: "generous_professor",
    professor: "generous_professor",
    avalanche: "advice_avalanche",
    advice: "advice_avalanche",
    surface: "surface_scanner",
    scanner: "surface_scanner",
    framework: "framework_drop",
    drop: "framework_drop",
    agenda: "agenda_abandoner",
    abandoner: "agenda_abandoner",
    passenger: "passenger",
    control: "passenger",
    premature: "premature_solution",
    solution: "premature_solution",
    mirror: "mirror_close",
    close: "mirror_close",
    permission: "permission_builder",
    builder: "permission_builder",
    "micro-commitment": "permission_builder",
    "soft close": "soft_close_fade",
    fade: "soft_close_fade",
    "over-explain": "over_explain_loop",
    loop: "over_explain_loop",
  };

  detectedPatterns.forEach((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    for (const [keyword, patternId] of Object.entries(keywordMapping)) {
      if (lowerPattern.includes(keyword)) {
        patternCounts.set(patternId, (patternCounts.get(patternId) || 0) + 1);
        break;
      }
    }
  });

  return patternCounts;
}

// Extract coaching insights from markdown
function extractCoachingNarrative(markdown: string): string {
  // Look for bottom line or executive summary
  const bottomLineMatch = markdown.match(
    /(?:BOTTOM LINE|Executive Summary)[:\s]*\n([^#]+)/i
  );
  if (bottomLineMatch) {
    return bottomLineMatch[1].trim().slice(0, 500);
  }

  // Fall back to first paragraph after summary
  const summaryMatch = markdown.match(/(?:Snap Take|Summary)[:\s]*\n([^#]+)/i);
  if (summaryMatch) {
    return summaryMatch[1].trim().slice(0, 500);
  }

  return "Analyze more calls to get personalized coaching insights.";
}

// Extract buyer name from markdown
function extractBuyerInfo(markdown: string): {
  buyerName: string;
  companyName: string;
} {
  // Look for "Call: Name - Company" format
  const callMatch = markdown.match(
    /\*\*Call:\*\*\s*([^-\n]+)\s*-?\s*([^\n*]*)/i
  );
  if (callMatch) {
    return {
      buyerName: callMatch[1].trim(),
      companyName: callMatch[2]?.trim() || "Unknown Company",
    };
  }

  // Try other formats
  const nameMatch = markdown.match(
    /(?:with|Call with)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/
  );
  if (nameMatch) {
    return {
      buyerName: nameMatch[1],
      companyName: "Unknown Company",
    };
  }

  return { buyerName: "Prospect", companyName: "Unknown Company" };
}

// Determine the most prominent pattern for a call
function getHighlightedPattern(
  markdown: string,
  _snippets: CallSnippetRow[]
): { pattern: MacroPattern; isPositive: boolean } | null {
  // Extract patterns from markdown
  const detectedPatterns = extractPatternsFromMarkdown(markdown);
  const patternCounts = mapToCanonicalPatterns(detectedPatterns);

  // Find the most frequent positive pattern
  let maxPositiveCount = 0;
  let maxPositivePattern: MacroPattern | null = null;
  let maxNegativeCount = 0;
  let maxNegativePattern: MacroPattern | null = null;

  patternCounts.forEach((count, patternId) => {
    if (count > 0) {
      const pattern = getPatternById(patternId);
      if (pattern) {
        if (pattern.polarity === "positive" && count > maxPositiveCount) {
          maxPositiveCount = count;
          maxPositivePattern = pattern;
        } else if (pattern.polarity === "negative" && count > maxNegativeCount) {
          maxNegativeCount = count;
          maxNegativePattern = pattern;
        }
      }
    }
  });

  // Prioritize showing positive patterns if present, else show negative
  if (maxPositivePattern) {
    return { pattern: maxPositivePattern, isPositive: true };
  }
  if (maxNegativePattern) {
    return { pattern: maxNegativePattern, isPositive: false };
  }

  // Default to a generic pattern based on score
  const defaultPattern = MACRO_PATTERNS.find(
    (p) => p.id === "diagnostic_reveal"
  );
  return defaultPattern ? { pattern: defaultPattern, isPositive: true } : null;
}

// Fetch and process real dashboard data
async function getDashboardData(
  supabase: ReturnType<typeof createServerComponentClient>,
  userId: string,
  userEmail: string
) {
  // Get user's agency
  const { data: assignment } = await (supabase as ReturnType<typeof createServerComponentClient>)
    .from("user_agency_assignments")
    .select("agency_id")
    .eq("user_id", userId)
    .single();

  const agencyId = (assignment as { agency_id?: string } | null)?.agency_id;

  // Fetch call scores for this user (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Try multiple query strategies to find the user's calls
  let callScores: unknown[] | null = null;
  let scoresError: Error | null = null;

  // Strategy 1: Query by user_id directly
  const { data: userCalls, error: userError } = await supabase
    .from("call_scores")
    .select(
      `
      id,
      overall_score,
      overall_grade,
      diagnosis_summary,
      markdown_response,
      version,
      created_at,
      ingestion_items (
        transcript_metadata,
        created_at,
        metadata
      )
    `
    )
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  if (userCalls && userCalls.length > 0) {
    callScores = userCalls;
  }

  // Strategy 2: Query by email in ingestion_items metadata
  // This catches calls submitted before the user account was linked
  if (!callScores || callScores.length === 0) {
    const { data: ingestionItems } = await supabase
      .from("ingestion_items")
      .select("id")
      .or(`metadata->>email.ilike.${userEmail},metadata->>lead_email.ilike.${userEmail}`);

    if (ingestionItems && ingestionItems.length > 0) {
      const ingestionIds = ingestionItems.map((i: { id: string }) => i.id);
      const { data: emailCalls, error: emailError } = await supabase
        .from("call_scores")
        .select(
          `
          id,
          overall_score,
          overall_grade,
          diagnosis_summary,
          markdown_response,
          version,
          created_at,
          ingestion_items (
            transcript_metadata,
            created_at,
            metadata
          )
        `
        )
        .in("ingestion_item_id", ingestionIds)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (emailCalls && emailCalls.length > 0) {
        callScores = emailCalls;
      }
      scoresError = emailError as Error | null;
    }
  }

  // Strategy 3: Query by agency_id if user has an agency
  if ((!callScores || callScores.length === 0) && agencyId) {
    const { data: agencyCalls, error: agencyError } = await supabase
      .from("call_scores")
      .select(
        `
        id,
        overall_score,
        overall_grade,
        diagnosis_summary,
        markdown_response,
        version,
        created_at,
        ingestion_items (
          transcript_metadata,
          created_at,
          metadata
        )
      `
      )
      .eq("agency_id", agencyId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    if (agencyCalls && agencyCalls.length > 0) {
      callScores = agencyCalls;
    }
    scoresError = agencyError as Error | null;
  }

  // Strategy 4: Query tool_runs by email and find related call_scores
  if (!callScores || callScores.length === 0) {
    const { data: toolRuns } = await supabase
      .from("tool_runs")
      .select("ingestion_item_id")
      .ilike("lead_email", userEmail)
      .not("ingestion_item_id", "is", null);

    if (toolRuns && toolRuns.length > 0) {
      const ingestionIds = toolRuns
        .map((t: { ingestion_item_id: string | null }) => t.ingestion_item_id)
        .filter(Boolean);

      if (ingestionIds.length > 0) {
        const { data: toolRunCalls, error: toolError } = await supabase
          .from("call_scores")
          .select(
            `
            id,
            overall_score,
            overall_grade,
            diagnosis_summary,
            markdown_response,
            version,
            created_at,
            ingestion_items (
              transcript_metadata,
              created_at,
              metadata
            )
          `
          )
          .in("ingestion_item_id", ingestionIds)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20);

        if (toolRunCalls && toolRunCalls.length > 0) {
          callScores = toolRunCalls;
        }
        scoresError = toolError as Error | null;
      }
    }
  }

  // Strategy 5: Fallback - try querying all and filter client-side
  if (!callScores || callScores.length === 0) {
    const { data: allCalls, error: allError } = await supabase
      .from("call_scores")
      .select(
        `
        id,
        overall_score,
        overall_grade,
        diagnosis_summary,
        markdown_response,
        version,
        created_at,
        user_id,
        agency_id,
        ingestion_items (
          transcript_metadata,
          created_at,
          user_id,
          metadata
        )
      `
      )
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter to calls that belong to this user or their agency
    if (allCalls) {
      callScores = allCalls.filter((call: any) => {
        const ingestionEmail = call.ingestion_items?.metadata?.email?.toLowerCase();
        const ingestionLeadEmail = call.ingestion_items?.metadata?.lead_email?.toLowerCase();
        return (
          call.user_id === userId ||
          call.agency_id === agencyId ||
          (call.ingestion_items as any)?.user_id === userId ||
          ingestionEmail === userEmail.toLowerCase() ||
          ingestionLeadEmail === userEmail.toLowerCase()
        );
      });
    }
    scoresError = allError as Error | null;
  }

  if (scoresError) {
    console.error("Error fetching call scores:", scoresError);
  }

  const scores = (callScores || []) as unknown as CallScoreRow[];

  // Fetch snippets for these calls
  const callScoreIds = scores.map((s) => s.id);
  let snippets: CallSnippetRow[] = [];

  if (callScoreIds.length > 0) {
    const { data: snippetData } = await supabase
      .from("call_snippets")
      .select("*")
      .in("call_score_id", callScoreIds);

    snippets = (snippetData || []) as unknown as CallSnippetRow[];
  }

  // Fetch follow-ups
  let followUps: FollowUpRow[] = [];
  if (callScoreIds.length > 0) {
    const { data: followUpData } = await supabase
      .from("follow_up_templates")
      .select("*")
      .in("call_score_id", callScoreIds);

    followUps = (followUpData || []) as unknown as FollowUpRow[];
  }

  // Process pattern data from all calls
  const allPatternCounts = new Map<string, number>();
  MACRO_PATTERNS.forEach((p) => allPatternCounts.set(p.id, 0));

  scores.forEach((score) => {
    if (score.markdown_response) {
      const patterns = extractPatternsFromMarkdown(score.markdown_response);
      const counts = mapToCanonicalPatterns(patterns);
      counts.forEach((count, patternId) => {
        allPatternCounts.set(
          patternId,
          (allPatternCounts.get(patternId) || 0) + count
        );
      });
    }
  });

  // Build pattern data for grid
  const patternData: Array<{
    patternId: string;
    frequency: number;
    totalCalls: number;
    trend: "up" | "down" | "stable";
    representativeQuote?: string;
    coachingNote?: string;
  }> = MACRO_PATTERNS.map((pattern) => {
    const frequency = allPatternCounts.get(pattern.id) || 0;
    const isNegative = pattern.polarity === "negative";

    // TODO: Calculate actual trend from historical data when available
    // For now, default to stable
    const trend: "up" | "down" | "stable" = "stable";

    return {
      patternId: pattern.id,
      frequency,
      totalCalls: scores.length || 1,
      trend,
      representativeQuote:
        isNegative && frequency > 0
          ? snippets.find((s) => s.snippet_type === "weakness")
              ?.transcript_quote
          : undefined,
      coachingNote:
        frequency > 0
          ? `Detected in ${frequency} of your last ${scores.length} calls.`
          : undefined,
    };
  });

  /**
   * Next Call Focus Selection Logic
   *
   * Priority rules for selecting which negative pattern to feature:
   * 1. Highest frequency negative pattern that is also regressing (trending worse)
   * 2. If no regression, highest frequency negative pattern
   * 3. Tie-breaker: Activation > Control > Diagnosis > Connection
   *    (close patterns hurt more than rapport patterns)
   */
  const categoryPriority: Record<string, number> = {
    activation: 4, // Highest priority - close patterns hurt most
    control: 3,
    diagnosis: 2,
    connection: 1, // Lowest priority
  };

  const negativePatternData = patternData.filter((d) => {
    const pattern = getPatternById(d.patternId);
    return pattern?.polarity === "negative" && d.frequency > 0;
  });

  // Sort by: 1) regressing first, 2) frequency, 3) category priority
  negativePatternData.sort((a, b) => {
    const patternA = getPatternById(a.patternId);
    const patternB = getPatternById(b.patternId);

    // Priority 1: Regressing patterns first (trend = 'down' means getting worse)
    const aRegressing = a.trend === "down" ? 1 : 0;
    const bRegressing = b.trend === "down" ? 1 : 0;
    if (aRegressing !== bRegressing) {
      return bRegressing - aRegressing; // Regressing patterns first
    }

    // Priority 2: Higher frequency
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }

    // Priority 3: Category tie-breaker (Activation > Control > Diagnosis > Connection)
    const aPriority = categoryPriority[patternA?.category || "connection"] || 1;
    const bPriority = categoryPriority[patternB?.category || "connection"] || 1;
    return bPriority - aPriority;
  });

  const worstPattern = negativePatternData[0];
  const worstPatternInfo = worstPattern
    ? getPatternById(worstPattern.patternId)
    : null;

  // Build recent calls list
  const recentCalls = scores.slice(0, 5).map((score) => {
    const callSnippets = snippets.filter((s) => s.call_score_id === score.id);
    const metadata = score.ingestion_items?.transcript_metadata as {
      prospect_company?: string;
    } | null;

    const { buyerName, companyName } = score.markdown_response
      ? extractBuyerInfo(score.markdown_response)
      : {
          buyerName: "Prospect",
          companyName: metadata?.prospect_company || "Company",
        };

    const highlightedPattern = score.markdown_response
      ? getHighlightedPattern(score.markdown_response, callSnippets)
      : { pattern: MACRO_PATTERNS[0], isPositive: true };

    const date = new Date(score.created_at);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      id: score.id,
      buyerName,
      companyName,
      date: formattedDate,
      score: Math.round((score.overall_score || 7) * 10),
      highlightedPattern: highlightedPattern || {
        pattern: MACRO_PATTERNS[0],
        isPositive: true,
      },
      coachingNote:
        score.diagnosis_summary?.slice(0, 100) ||
        "Review the full analysis for coaching notes.",
    };
  });

  // Build follow-up items
  const followUpItems = followUps.slice(0, 3).map((fu) => {
    const relatedScore = scores.find((s) => s.id === fu.call_score_id);
    const { buyerName, companyName } = relatedScore?.markdown_response
      ? extractBuyerInfo(relatedScore.markdown_response)
      : { buyerName: "Prospect", companyName: "Company" };

    return {
      callId: fu.call_score_id,
      callName: `${buyerName} - ${companyName}`,
      riskNote: fu.subject_line || "Follow-up recommended",
      recommendedFollowUp: fu.body.slice(0, 200),
    };
  });

  // Calculate metrics
  const validScores = scores.filter((s) => s.overall_score !== null);
  const avgScore =
    validScores.length > 0
      ? validScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) /
        validScores.length
      : 0;

  // Get coaching narrative from most recent call
  const coachingNarrative = scores[0]?.markdown_response
    ? extractCoachingNarrative(scores[0].markdown_response)
    : scores.length === 0
      ? "No calls analyzed yet. Submit a call transcript to get started with personalized coaching."
      : "Keep analyzing calls to build your pattern profile.";

  return {
    patternData,
    nextCallFocus: worstPatternInfo
      ? {
          pattern: worstPatternInfo,
          whyCostingDeals: worstPatternInfo.description,
          correctiveMove:
            worstPatternInfo.correctiveMove ||
            "Focus on this pattern in your next call.",
          exampleLanguage: undefined,
        }
      : null,
    momentum: {
      mostImproved: undefined,
      mostRegressed: undefined,
      hasEnoughData: scores.length >= 5,
    },
    recentCalls,
    followUpItems,
    coachingNarrative,
    metrics: {
      callsInRange: scores.length,
      overallScore: Math.round(avgScore * 10),
      trendVsPrevious: 0,
    },
  };
}

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's name from metadata or email
  const userName =
    user.user_metadata?.first_name || user.email?.split("@")[0] || "there";

  // Get dashboard data from database
  const data = await getDashboardData(supabase, user.id, user.email || '');

  return (
    <div className="min-h-screen bg-black">
      {/* ============================================
          BLOCK 1: GLOBAL HEADER
          Purpose: Orientation + Action
          Rules: Zero intelligence, zero scores
          ============================================ */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div>
              <div className="font-anton text-2xl tracking-wide uppercase">
                <span className="text-white">SALES</span>
                <span className="text-[#E51B23]">OS</span>
              </div>
              <div className="font-anton text-xs text-[#FFDE59] uppercase tracking-wider">
                CALL LAB PRO
              </div>
            </div>

            {/* User */}
            <div className="hidden md:block border-l border-[#333] pl-6">
              <p className="text-white text-sm font-medium">{userName}</p>
              <p className="text-[#666] text-xs">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select className="bg-black border border-[#333] text-white text-sm px-3 py-2 rounded focus:border-[#E51B23] outline-none">
              <option value="30">Last 30 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            {/* Primary CTA */}
            <Link
              href="/call-lab"
              className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
            >
              Analyze New Call
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Empty State */}
        {data.metrics.callsInRange === 0 ? (
          <div className="border border-[#333] rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">📞</div>
            <h2 className="font-anton text-2xl text-[#FFDE59] uppercase mb-4">
              No Calls Analyzed Yet
            </h2>
            <p className="text-[#B3B3B3] mb-8 max-w-md mx-auto">
              Submit your first call transcript to start building your pattern
              profile and get personalized coaching insights.
            </p>
            <Link
              href="/call-lab"
              className="inline-block bg-[#E51B23] text-white px-8 py-4 font-anton text-lg uppercase tracking-wider hover:bg-[#C41820] transition-colors"
            >
              Analyze Your First Call
            </Link>
          </div>
        ) : (
          <>
            {/* ============================================
                BLOCK 2: NEXT CALL FOCUS (Primary Command Block)
                Purpose: Tell user what to fix on the very next call
                Rules: Exactly one pattern, always negative, always behavioral
                THIS BLOCK VISUALLY DOMINATES THE PAGE
                ============================================ */}
            {data.nextCallFocus && (
              <NextCallFocus
                pattern={data.nextCallFocus.pattern}
                whyCostingDeals={data.nextCallFocus.whyCostingDeals}
                correctiveMove={data.nextCallFocus.correctiveMove}
                exampleLanguage={data.nextCallFocus.exampleLanguage}
              />
            )}

            {/* ============================================
                BLOCK 3: SITUATION SNAPSHOT (Quick Context)
                Purpose: Quick grounding without vanity metrics
                Rules: Three numbers max, tooltips explain derivation
                ============================================ */}
            <SituationSnapshot
              callsInRange={data.metrics.callsInRange}
              overallScore={data.metrics.overallScore}
              trendVsPrevious={data.metrics.trendVsPrevious}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Pattern Intelligence */}
              <div className="lg:col-span-2 space-y-8">
                {/* ============================================
                    BLOCK 4: PATTERN INTELLIGENCE (Core Diagnostic)
                    Purpose: Expose the real shape of selling behavior
                    Rules: Only 18 canonical patterns, grouped by category
                           Every pattern appears once and only once
                           Patterns are facts, not judgments
                    ============================================ */}
                <PatternIntelligenceGrid
                  patternData={data.patternData}
                  totalCalls={data.metrics.callsInRange}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* ============================================
                    BLOCK 5: MOMENTUM SIGNALS
                    Purpose: Show change, not totals
                    Rules: Only shown with enough historical data
                    ============================================ */}
                <MomentumSignals
                  mostImproved={data.momentum.mostImproved}
                  mostRegressed={data.momentum.mostRegressed}
                  hasEnoughData={data.momentum.hasEnoughData}
                />

                {/* ============================================
                    BLOCK 8: COACHING NARRATIVE (Derived Insight)
                    Purpose: Translate patterns into human understanding
                    Rules: No charts, no scores, interpretation not measurement
                    ============================================ */}
                <CoachingNarrative narrative={data.coachingNarrative} />

                {/* ============================================
                    BLOCK 7: FOLLOW-UP INTELLIGENCE
                    Purpose: Protect deals after the conversation ends
                    Rules: Only appears when action is required
                    ============================================ */}
                <FollowUpIntelligence items={data.followUpItems} />
              </div>
            </div>

            {/* ============================================
                BLOCK 6: RECENT CALLS (Evidence Layer)
                Purpose: Connect insight to reality
                Rules: 3-5 calls, one macro pattern per call, drill-down not analytics
                ============================================ */}
            <RecentCallsList calls={data.recentCalls} />
          </>
        )}

        {/* ============================================
            BLOCK 9: FOOTER ACTIONS
            Purpose: Close the loop
            ============================================ */}
        <footer className="border-t border-[#333] pt-8 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link
                href="/call-lab"
                className="bg-[#E51B23] text-white px-6 py-3 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
              >
                Analyze New Call
              </Link>
              <Link
                href="/wtf-sales-guide"
                className="text-[#B3B3B3] text-sm hover:text-white transition-colors"
              >
                Coaching Resources
              </Link>
            </div>

            <div className="flex items-center gap-4 text-sm text-[#666]">
              <Link
                href="/settings"
                className="hover:text-white transition-colors"
              >
                Settings
              </Link>
              <span>•</span>
              <Link href="/labs" className="hover:text-white transition-colors">
                All Labs
              </Link>
              <span>•</span>
              <span>{user.email}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
