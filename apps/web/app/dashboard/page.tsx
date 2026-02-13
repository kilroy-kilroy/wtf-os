import { createClient } from '@/lib/supabase-auth-server';
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
  DiscoveryLabActivity,
  RecentBriefsList,
  ProInsightsPanel,
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
  const lowerMarkdown = markdown.toLowerCase();

  // Search for each canonical pattern name directly in the markdown
  // This is the most reliable approach - just look for pattern names
  MACRO_PATTERNS.forEach((pattern) => {
    const patternNameLower = pattern.name.toLowerCase();
    // Check if pattern name appears in markdown
    if (lowerMarkdown.includes(patternNameLower)) {
      patterns.push(pattern.name);
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
  // IMPORTANT: Pattern IDs must match exactly those defined in lib/macro-patterns.ts
  const keywordMapping: Record<string, string> = {
    // CONNECTION & RAPPORT
    "cultural handshake": "cultural_handshake",
    cultural: "cultural_handshake",
    handshake: "cultural_handshake",
    "peer validation": "peer_validation_engine",
    peer: "peer_validation_engine",
    "validation engine": "peer_validation_engine",
    "vulnerability flip": "vulnerability_flip",
    vulnerability: "vulnerability_flip",
    flip: "vulnerability_flip",
    "scenic route": "scenic_route",
    scenic: "scenic_route",
    "small talk": "scenic_route",
    "business blitzer": "business_blitzer",
    blitzer: "business_blitzer",
    rushed: "business_blitzer",

    // DIAGNOSIS & DISCOVERY
    "diagnostic reveal": "diagnostic_reveal",
    diagnostic: "diagnostic_reveal",
    "self diagnosis": "self_diagnosis_pull",
    "diagnosis pull": "self_diagnosis_pull",
    "generous professor": "generous_professor",
    generous: "generous_professor",
    professor: "generous_professor",
    "advice avalanche": "advice_avalanche",
    avalanche: "advice_avalanche",
    "surface scanner": "surface_scanner",
    surface: "surface_scanner",
    scanner: "surface_scanner",

    // CONTROL & AGENDA
    "framework drop": "framework_drop",
    framework: "framework_drop",
    "agenda abandoner": "agenda_abandoner",
    abandoner: "agenda_abandoner",
    passenger: "passenger",
    "premature solution": "premature_solution",
    premature: "premature_solution",
    "pitched too early": "premature_solution",

    // ACTIVATION & CLOSE
    "mirror close": "mirror_close",
    mirror: "mirror_close",
    "permission builder": "permission_builder",
    permission: "permission_builder",
    "micro-commitment": "permission_builder",
    "soft close": "soft_close_fade",
    "soft close fade": "soft_close_fade",
    fade: "soft_close_fade",
    "let me know": "soft_close_fade",
    "over-explain": "over_explain_loop",
    "over explain": "over_explain_loop",
    loop: "over_explain_loop",
    "talking past": "over_explain_loop",
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

// Synthesize coaching narrative from pattern frequency data
function synthesizeCoachingNarrative(
  patternData: Array<{ patternId: string; frequency: number; totalCalls: number }>,
  patterns: typeof MACRO_PATTERNS
): string {
  // Find the most frequent negative pattern (the biggest issue)
  const negativePatterns = patternData
    .filter((d) => {
      const pattern = patterns.find((p) => p.id === d.patternId);
      return pattern?.polarity === "negative" && d.frequency > 0;
    })
    .sort((a, b) => b.frequency - a.frequency);

  // Find the most frequent positive pattern (what they're doing well)
  const positivePatterns = patternData
    .filter((d) => {
      const pattern = patterns.find((p) => p.id === d.patternId);
      return pattern?.polarity === "positive" && d.frequency > 0;
    })
    .sort((a, b) => b.frequency - a.frequency);

  const worstPattern = negativePatterns[0];
  const bestPattern = positivePatterns[0];

  if (!worstPattern && !bestPattern) {
    return "Keep analyzing calls to build your pattern profile and get personalized coaching insights.";
  }

  let narrative = "";

  // Lead with the problem pattern
  if (worstPattern) {
    const pattern = patterns.find((p) => p.id === worstPattern.patternId);
    if (pattern) {
      narrative += `You're using **${pattern.name}** in ${worstPattern.frequency}/${worstPattern.totalCalls} calls. `;
      narrative += `${pattern.description.slice(0, 100)}... `;

      // Suggest the corrective move
      if (pattern.correctiveMove) {
        narrative += `Try: ${pattern.correctiveMove.slice(0, 100)}`;
      }
    }
  } else if (bestPattern) {
    // If no negative patterns, highlight what's working
    const pattern = patterns.find((p) => p.id === bestPattern.patternId);
    if (pattern) {
      narrative += `Strong use of **${pattern.name}** in ${bestPattern.frequency}/${bestPattern.totalCalls} calls. `;
      narrative += `Keep building on this strength.`;
    }
  }

  return narrative || "Keep analyzing calls to build your pattern profile.";
}

// Extract coaching insights from markdown (legacy fallback)
function extractCoachingNarrativeFromMarkdown(markdown: string): string {
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

// Extract buyer info from transcript metadata (Fireflies participants data)
function extractBuyerInfoFromMetadata(
  transcriptMetadata: Record<string, unknown> | null
): { buyerName: string; companyName: string } | null {
  if (!transcriptMetadata) return null;

  // Fireflies data structure: participants array with name and email
  const participants = transcriptMetadata.participants as Array<{
    name?: string;
    email?: string;
    displayName?: string;
  }> | undefined;

  if (participants && participants.length > 0) {
    // Find the first participant that isn't the rep (often the first non-host)
    // Fireflies typically puts external participants after the host
    const prospect = participants.length > 1 ? participants[1] : participants[0];
    const prospectName = prospect?.displayName || prospect?.name || "Prospect";

    // Try to extract company from email domain if available
    let companyName = "Unknown Company";
    if (prospect?.email) {
      const domain = prospect.email.split("@")[1];
      if (domain && !domain.includes("gmail") && !domain.includes("yahoo") && !domain.includes("hotmail")) {
        // Capitalize first letter of domain name (before .com)
        const domainName = domain.split(".")[0];
        companyName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }

    return { buyerName: prospectName, companyName };
  }

  // Check for prospect_company field directly in metadata
  const prospectCompany = transcriptMetadata.prospect_company as string | undefined;
  const title = transcriptMetadata.title as string | undefined;

  if (prospectCompany || title) {
    return {
      buyerName: title?.split(" - ")[0]?.trim() || "Prospect",
      companyName: prospectCompany || "Unknown Company",
    };
  }

  return null;
}

// Extract buyer name from markdown (fallback)
function extractBuyerInfoFromMarkdown(markdown: string): {
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail: string
) {
  // Fetch call scores for this user (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let callScores: unknown[] | null = null;

  // CANONICAL APPROACH: Query by email via tool_runs
  // Email is the primary identifier - find all tool_runs with this email
  const { data: toolRuns } = await supabase
    .from("tool_runs")
    .select("ingestion_item_id")
    .eq("lead_email", userEmail)
    .not("ingestion_item_id", "is", null)
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (toolRuns && toolRuns.length > 0) {
    const ingestionIds = toolRuns
      .map((t: { ingestion_item_id: string | null }) => t.ingestion_item_id)
      .filter((id): id is string => id !== null);

    if (ingestionIds.length > 0) {
      const { data: emailCalls } = await supabase
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
        .order("created_at", { ascending: false })
        .limit(20);

      if (emailCalls && emailCalls.length > 0) {
        callScores = emailCalls;
      }
    }
  }

  // Fallback: Query by user_id directly (for data created while logged in)
  if (!callScores || callScores.length === 0) {
    const { data: userCalls } = await supabase
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

  // Window size for pattern frequency display (e.g., "X out of last 8 calls")
  // This matches the user's expectation of tracking patterns across a rolling window
  const PATTERN_WINDOW_SIZE = 8;
  const windowSize = Math.min(PATTERN_WINDOW_SIZE, scores.length) || 1;

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
      totalCalls: windowSize,
      trend,
      representativeQuote:
        isNegative && frequency > 0
          ? snippets.find((s) => s.snippet_type === "weakness")
              ?.transcript_quote
          : undefined,
      coachingNote:
        frequency > 0
          ? `Detected in ${frequency} of your last ${windowSize} calls.`
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
    const transcriptMetadata = score.ingestion_items?.transcript_metadata as Record<string, unknown> | null;

    // Priority: 1) transcript_metadata.participants, 2) markdown parsing, 3) defaults
    const metadataInfo = extractBuyerInfoFromMetadata(transcriptMetadata);
    const markdownInfo = score.markdown_response
      ? extractBuyerInfoFromMarkdown(score.markdown_response)
      : null;

    const { buyerName, companyName } = metadataInfo || markdownInfo || {
      buyerName: "Prospect",
      companyName: "Unknown Company",
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
    const fuTranscriptMetadata = relatedScore?.ingestion_items?.transcript_metadata as Record<string, unknown> | null;
    const fuMetadataInfo = extractBuyerInfoFromMetadata(fuTranscriptMetadata);
    const fuMarkdownInfo = relatedScore?.markdown_response
      ? extractBuyerInfoFromMarkdown(relatedScore.markdown_response)
      : null;
    const { buyerName, companyName } = fuMetadataInfo || fuMarkdownInfo || {
      buyerName: "Prospect",
      companyName: "Unknown Company",
    };

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

  // Synthesize coaching narrative from pattern frequency data
  // This provides actionable insight based on the user's actual pattern distribution
  const coachingNarrative = scores.length === 0
    ? "No calls analyzed yet. Submit a call transcript to get started with personalized coaching."
    : synthesizeCoachingNarrative(patternData, MACRO_PATTERNS);

  // ============================================
  // DISCOVERY LAB DATA
  // ============================================
  const { data: discoveryBriefs } = await (supabase as any)
    .from("discovery_briefs")
    .select("id, target_company, target_contact_name, target_contact_title, version, created_at")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  const briefs = (discoveryBriefs || []) as Array<{
    id: string;
    target_company: string;
    target_contact_name: string | null;
    target_contact_title: string | null;
    version: string;
    created_at: string;
  }>;

  const liteBriefs = briefs.filter((b) => b.version === "lite").length;
  const proBriefs = briefs.filter((b) => b.version === "pro").length;
  const companiesResearched = new Set(
    briefs.map((b) => b.target_company?.toLowerCase()).filter(Boolean)
  ).size;

  // Check which briefs have linked call reports
  const briefIds = briefs.map((b) => b.id);
  let linkedBriefIds = new Set<string>();
  if (briefIds.length > 0) {
    const { data: linkedCalls } = await (supabase as any)
      .from("call_lab_reports")
      .select("discovery_brief_id")
      .in("discovery_brief_id", briefIds);

    if (linkedCalls) {
      linkedBriefIds = new Set(
        (linkedCalls as Array<{ discovery_brief_id: string }>)
          .map((c) => c.discovery_brief_id)
          .filter(Boolean)
      );
    }
  }

  const prepToCallRate =
    briefs.length > 0 ? (linkedBriefIds.size / briefs.length) * 100 : null;

  // Prep Advantage: avg score on calls with linked briefs vs without
  // Requires call_lab_reports data — show null until enough linked pairs
  const prepAdvantage: number | null = null; // Phase 2: requires cross-table join

  const recentBriefs = briefs.slice(0, 5).map((b) => {
    const date = new Date(b.created_at);
    return {
      id: b.id,
      targetCompany: b.target_company || "Unknown Company",
      targetContactName: b.target_contact_name,
      targetContactTitle: b.target_contact_title,
      version: b.version,
      createdAt: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      hasLinkedCall: linkedBriefIds.has(b.id),
    };
  });

  const discoveryLab = {
    totalBriefs: briefs.length,
    liteBriefs,
    proBriefs,
    companiesResearched,
    prepToCallRate,
    prepAdvantage,
    recentBriefs,
  };

  // ============================================
  // PRO INSIGHTS (from Pro-version call reports)
  // ============================================
  const proScores = scores.filter((s) => s.version === "pro");

  // Extract "The One Thing" from Pro markdown responses
  const oneThingTracker: Array<{
    callId: string;
    behavior: string;
    callDate: string;
  }> = [];

  const performanceScoreAccumulator: Record<string, number[]> = {};

  for (const proReport of proScores.slice(0, 5)) {
    const md = proReport.markdown_response || "";

    // Extract THE ONE THING behavior
    const oneThingMatch = md.match(
      /THE\s+(?:ONE\s+)?BEHAVIOR[:\s]*\n?\s*(?:\*\*)?([^\n*]+)/i
    );
    if (oneThingMatch) {
      const date = new Date(proReport.created_at);
      oneThingTracker.push({
        callId: proReport.id,
        behavior: oneThingMatch[1].trim().replace(/\*+/g, ""),
        callDate: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    // Extract performance scores (9 dimensions, 0-10 scale)
    const scoreRegex =
      /(?:^|\n)\s*\d+\.\s*\*?\*?([A-Z][a-z]+(?:\s+[a-z]+)*)\*?\*?\s*[-–—:]\s*\*?\*?(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/gi;
    let scoreMatch;
    while ((scoreMatch = scoreRegex.exec(md)) !== null) {
      const label = scoreMatch[1].trim();
      const value = parseFloat(scoreMatch[2]);
      if (value >= 0 && value <= 10) {
        if (!performanceScoreAccumulator[label]) {
          performanceScoreAccumulator[label] = [];
        }
        performanceScoreAccumulator[label].push(value);
      }
    }
  }

  // Average performance scores across Pro reports
  const avgProScores = Object.entries(performanceScoreAccumulator)
    .map(([label, values]) => ({
      label,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 9);

  const proInsights = {
    oneThingTracker,
    avgProScores,
    totalProReports: proScores.length,
  };

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
    discoveryLab,
    proInsights,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
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
                DASHBOARD
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
        {/* ============================================
            BLOCK 1.5: DISCOVERY LAB ACTIVITY (Prep Intelligence)
            Purpose: Show pre-call research activity and prep-to-call pipeline
            Rules: Always visible (even with zero calls), drives Discovery Lab usage
            ============================================ */}
        <DiscoveryLabActivity
          totalBriefs={data.discoveryLab.totalBriefs}
          liteBriefs={data.discoveryLab.liteBriefs}
          proBriefs={data.discoveryLab.proBriefs}
          companiesResearched={data.discoveryLab.companiesResearched}
          prepToCallRate={data.discoveryLab.prepToCallRate}
          prepAdvantage={data.discoveryLab.prepAdvantage}
        />

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

                {/* ============================================
                    BLOCK 4.5: RECENT BRIEFS (Prep Evidence)
                    Purpose: Show recent Discovery Lab briefs with call linkage status
                    Rules: Up to 5 briefs, version badge, "Called" vs "Prepped" status
                    ============================================ */}
                <RecentBriefsList briefs={data.discoveryLab.recentBriefs} />
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
                    BLOCK 5.5: PRO INSIGHTS (Call Lab Pro Aggregation)
                    Purpose: Surface "The One Thing" tracker and performance
                    dimension averages from Pro reports
                    Rules: Only shown when Pro reports exist
                    ============================================ */}
                <ProInsightsPanel
                  oneThingTracker={data.proInsights.oneThingTracker}
                  avgProScores={data.proInsights.avgProScores}
                  totalProReports={data.proInsights.totalProReports}
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
                href="/discovery-lab-pro"
                className="bg-[#FFDE59] text-black px-6 py-3 font-anton text-sm uppercase tracking-wider hover:bg-[#E5C84F] transition-colors"
              >
                Prep New Call
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
