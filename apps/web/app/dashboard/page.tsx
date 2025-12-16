import { getDashboardData } from "@/lib/get-dashboard-data";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DashboardClient,
  type DetectedPattern,
  type FocusArea,
  type QuickWin,
} from "@/components/dashboard";

// Pattern counter mapping for next call focus advice
const PATTERN_COUNTERS: Record<string, string> = {
  scenic_route: "framework_drop",
  business_blitzer: "cultural_handshake",
  generous_professor: "diagnostic_reveal",
  advice_avalanche: "self_diagnosis_pull",
  surface_scanner: "diagnostic_reveal",
  agenda_abandoner: "permission_builder",
  passenger: "framework_drop",
  premature_solution: "diagnostic_reveal",
  soft_close_fade: "mirror_close",
  over_explain_loop: "permission_builder",
};

function getCounterPatternAdvice(patternId: string): string {
  const counterPatternId = PATTERN_COUNTERS[patternId];

  const adviceMap: Record<string, string> = {
    framework_drop: "Use a clear framework to structure the conversation",
    cultural_handshake: "Start with warmth and shared context before business talk",
    diagnostic_reveal: "Dig deeper into the problem before offering solutions",
    self_diagnosis_pull: "Help buyers discover their own needs through questions",
    permission_builder: "Ask permission before shifting topics or going deeper",
    mirror_close: "Reflect the buyer's criteria back and ask for the decision",
  };

  return adviceMap[counterPatternId] || "Focus on closing with clarity";
}

// Generate weekly focus based on most frequent mistake
function generateWeeklyFocus(patternId: string | undefined | null, patternName: string | undefined | null): FocusArea | null {
  if (!patternId || !patternName) return null;

  const counterPatternId = PATTERN_COUNTERS[patternId];
  if (!counterPatternId) return null;

  const counterNames: Record<string, string> = {
    framework_drop: "The Framework Drop",
    cultural_handshake: "The Cultural Handshake",
    diagnostic_reveal: "The Diagnostic Reveal",
    self_diagnosis_pull: "The Self Diagnosis Pull",
    permission_builder: "The Permission Builder",
    mirror_close: "The Mirror Close",
  };

  const practiceSteps: Record<string, string[]> = {
    framework_drop: [
      "Prepare 2-3 frameworks before each call",
      "Introduce your framework in the first 5 minutes",
      "Use the framework to guide discovery questions",
    ],
    cultural_handshake: [
      "Research the prospect's background before the call",
      "Find a genuine shared interest or experience",
      "Lead with warmth before diving into business",
    ],
    diagnostic_reveal: [
      "Ask 'what else?' at least twice per discovery",
      "Quantify the cost of the current problem",
      "Name the hidden risk they haven't articulated",
    ],
    self_diagnosis_pull: [
      "Use 'what happens if you do nothing?' questions",
      "Let them voice the pain before offering solutions",
      "Reflect back their language to confirm understanding",
    ],
    permission_builder: [
      "Ask permission before changing topics",
      "Use 'would it be okay if...' transitions",
      "Create psychological safety through permission",
    ],
    mirror_close: [
      "Summarize their stated criteria back to them",
      "Use 'based on what you said...' framing",
      "Ask for the decision calmly and directly",
    ],
  };

  return {
    pattern_id: counterPatternId,
    pattern_name: counterNames[counterPatternId] || "Unknown Pattern",
    reason: `Counter your tendency toward ${patternName}`,
    practice_steps: practiceSteps[counterPatternId] || ["Practice this pattern consciously"],
    progress: 0,
    calls_this_week: 0,
    target_calls: 5,
  };
}

// Generate quick wins based on negative patterns
function generateQuickWins(negativePatterns: DetectedPattern[]): QuickWin[] {
  const quickWinTemplates: Record<string, { title: string; description: string; example: string; time: string }> = {
    scenic_route: {
      title: "Set a 3-minute timer for rapport",
      description: "Rapport is essential but shouldn't derail discovery",
      example: "After 3 minutes, say: 'I want to be respectful of your time - let me share why I was excited to connect...'",
      time: "30 seconds",
    },
    business_blitzer: {
      title: "Ask about their weekend first",
      description: "One personal question builds trust before business",
      example: "Before business: 'How was your weekend?' or 'How's your [time of year] going?'",
      time: "1 minute",
    },
    generous_professor: {
      title: "Stop at 2 insights max",
      description: "Share enough to demonstrate value, not to teach everything",
      example: "After 2 insights: 'I have more on this, but let me make sure this is relevant first...'",
      time: "Ongoing",
    },
    advice_avalanche: {
      title: "Ask 'what have you tried?' first",
      description: "Understand their context before offering solutions",
      example: "Before solving: 'What have you tried already?' and 'What worked/didn't work?'",
      time: "2 minutes",
    },
    surface_scanner: {
      title: "Use 'what else?' twice per topic",
      description: "The first answer is rarely the real answer",
      example: "After their response: 'What else is contributing to that?' and wait",
      time: "30 seconds each",
    },
    premature_solution: {
      title: "Pause before pitching",
      description: "Ask one more question before jumping to solutions",
      example: "Before pitching: 'Before I share how we might help, can I ask one more thing?'",
      time: "15 seconds",
    },
    soft_close_fade: {
      title: "End with 'what's our next step?'",
      description: "Never end a call without a concrete commitment",
      example: "At call end: 'Based on our conversation, what's the logical next step?'",
      time: "30 seconds",
    },
    over_explain_loop: {
      title: "Answer objections with questions",
      description: "Re-frame challenges instead of defending",
      example: "When challenged: 'Help me understand what's driving that concern?'",
      time: "Immediate",
    },
  };

  const wins: QuickWin[] = [];

  for (const pattern of negativePatterns.slice(0, 3)) {
    const patternKey = pattern.id.toLowerCase().replace(/\s+/g, '_').replace(/^the_/, '');
    const template = quickWinTemplates[patternKey];

    if (template) {
      wins.push({
        id: `win_${patternKey}`,
        title: template.title,
        description: template.description,
        example_phrase: template.example,
        time_to_implement: template.time,
        related_pattern_id: patternKey,
      });
    }
  }

  return wins;
}

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getDashboardData(user.id);
  const { metrics, patternRadar, detectedPatterns, recentCalls, quickInsights } = data;

  // Calculate scores
  const overallScore = Math.round(metrics.skillImprovementIndex);
  const trustVelocity = Math.round(
    metrics.trustVelocityDelta > 0
      ? Math.min(100, 50 + metrics.trustVelocityDelta)
      : Math.max(0, 50 + metrics.trustVelocityDelta)
  );
  const closeDiscipline = Math.round(metrics.agendaStability);

  // Clean call rate calculation
  const cleanCallPercentage = Math.round(100 - metrics.patternDensity);
  const cleanCallCount = Math.round(metrics.callsLast30 * (cleanCallPercentage / 100));

  // Transform recent calls to new format
  const transformedCalls = recentCalls.map((call) => ({
    id: call.id,
    buyer_name: call.buyerName || "Unknown",
    company: call.companyName || undefined,
    date: new Date(call.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    score: call.score || 0,
    top_positive_pattern: null as {
      id: string;
      name: string;
      category: "connection" | "diagnosis" | "control" | "activation";
    } | null,
    top_negative_pattern: call.primaryPattern
      ? {
          id: call.primaryPattern.toLowerCase().replace(/\s+/g, '_').replace(/^the_/, ''),
          name: call.primaryPattern,
          category: "connection" as const,
        }
      : null,
    next_step: call.improvementHighlight || undefined,
  }));

  // Use aggregated patterns from calls (canonical pattern names)
  const positivePatterns: DetectedPattern[] = detectedPatterns
    .filter(p => p.polarity === "positive")
    .slice(0, 5);

  const negativePatterns: DetectedPattern[] = detectedPatterns
    .filter(p => p.polarity === "negative")
    .slice(0, 5);

  // Momentum data - use top detected patterns
  const topPositive = positivePatterns[0];
  const topNegative = negativePatterns[0];

  const biggestWin = topPositive
    ? {
        pattern_id: topPositive.id,
        macro_name: topPositive.name,
        frequency: topPositive.frequency,
        total_calls: metrics.callsLast30,
        percentage: topPositive.percentage,
        trend: "rising" as const,
      }
    : undefined;

  const biggestFixId = topNegative?.id;

  const biggestFix = topNegative
    ? {
        pattern_id: topNegative.id,
        macro_name: topNegative.name,
        frequency: topNegative.frequency,
        total_calls: metrics.callsLast30,
        percentage: topNegative.percentage,
      }
    : undefined;

  const nextFocus = biggestFixId
    ? getCounterPatternAdvice(biggestFixId)
    : quickInsights.nextAction || quickInsights.skillToPractice || "Keep building trust";

  // Generate weekly focus and quick wins
  const weeklyFocus = generateWeeklyFocus(biggestFixId, patternRadar.mostFrequentMistake);
  const quickWins = generateQuickWins(negativePatterns);

  return (
    <DashboardClient
      metrics={{
        overallScore,
        trustVelocity,
        closeDiscipline,
        cleanCallPercentage,
        cleanCallCount,
        totalCalls: metrics.callsLast30,
      }}
      positivePatterns={positivePatterns}
      negativePatterns={negativePatterns}
      transformedCalls={transformedCalls}
      momentum={{
        biggestWin,
        biggestFix,
        nextFocus,
      }}
      weeklyFocus={weeklyFocus}
      quickWins={quickWins}
    />
  );
}
