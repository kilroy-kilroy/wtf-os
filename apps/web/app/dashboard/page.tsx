import { getDashboardData } from "@/lib/get-dashboard-data";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CallCard,
  PatternIntelligence,
  MomentumSection,
  ScoreCard,
  CleanCallRate,
  type DetectedPattern,
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

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getDashboardData(user.id);
  const { metrics, patternRadar, recentCalls, quickInsights } = data;

  // Get user's name from metadata or email
  const userName = user.user_metadata?.first_name || user.email?.split("@")[0] || "there";
  const userEmail = user.email || "";

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
    // Map primary pattern as negative (historically these were friction patterns)
    top_positive_pattern: null, // Will come from full_report in future
    top_negative_pattern: call.primaryPattern
      ? {
          id: call.primaryPattern.toLowerCase().replace(/\s+/g, '_').replace(/^the_/, ''),
          name: call.primaryPattern,
          category: "connection" as const,
        }
      : null,
    next_step: call.improvementHighlight || undefined,
  }));

  // Transform pattern data for PatternIntelligence
  // Note: Current data structure doesn't separate patterns by polarity
  // We'll show skills as proxy until pattern extraction is updated
  const positivePatterns: DetectedPattern[] = patternRadar.topStrengths.map((s, i) => ({
    id: `strength_${i}`,
    name: s.name,
    category: "connection" as const,
    polarity: "positive" as const,
    frequency: Math.round(s.current),
    percentage: s.current,
  }));

  const negativePatterns: DetectedPattern[] = patternRadar.topWeaknesses.map((w, i) => ({
    id: `weakness_${i}`,
    name: w.name,
    category: "connection" as const,
    polarity: "negative" as const,
    frequency: Math.round(100 - w.current),
    percentage: 100 - w.current,
  }));

  // Momentum data
  const biggestWin = patternRadar.mostImprovedSkill
    ? {
        pattern_id: patternRadar.mostImprovedSkill.toLowerCase().replace(/\s+/g, '_'),
        macro_name: patternRadar.mostImprovedSkill,
        frequency: Math.round(patternRadar.topStrengths[0]?.current || 0),
        total_calls: metrics.callsLast30,
        percentage: patternRadar.topStrengths[0]?.current || 0,
        trend: "rising" as const,
      }
    : undefined;

  const biggestFixId = patternRadar.mostFrequentMistake
    ? patternRadar.mostFrequentMistake.toLowerCase().replace(/\s+/g, '_').replace(/^the_/, '')
    : undefined;

  const biggestFix = patternRadar.mostFrequentMistake
    ? {
        pattern_id: biggestFixId!,
        macro_name: patternRadar.mostFrequentMistake,
        frequency: Math.round(metrics.patternDensity),
        total_calls: metrics.callsLast30,
        percentage: metrics.patternDensity,
      }
    : undefined;

  const nextFocus = biggestFixId
    ? getCounterPatternAdvice(biggestFixId)
    : quickInsights.nextAction || quickInsights.skillToPractice || "Keep building trust";

  return (
    <div className="min-h-screen bg-black py-8 px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-anton text-[48px] tracking-wide text-white">Dashboard</h1>
            <p className="text-[#666] text-sm">Your sales call performance</p>
          </div>
          <Link href="/call-lab">
            <button className="bg-[#E51B23] text-white px-8 py-4 font-anton text-sm tracking-wide hover:bg-[#FF2930] transition-colors">
              Analyze New Call
            </button>
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ScoreCard
            label="OVERALL SCORE"
            subtitle={`Average across ${metrics.callsLast30} calls`}
            value={overallScore}
            maxValue={100}
          />
          <ScoreCard
            label="TRUST VELOCITY"
            subtitle="How fast you build trust"
            value={trustVelocity}
            maxValue={100}
          />
          <ScoreCard
            label="CLOSE DISCIPLINE"
            subtitle="Next step commitment rate"
            value={closeDiscipline}
            maxValue={100}
          />
          <CleanCallRate
            percentage={cleanCallPercentage}
            cleanCalls={cleanCallCount}
            totalCalls={metrics.callsLast30}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Recent Calls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-anton text-lg tracking-wide text-white">
                Recent Calls
              </h2>
              <button className="text-[#E51B23] text-sm font-semibold underline hover:text-[#FF2930]">
                View All
              </button>
            </div>

            {transformedCalls.length > 0 ? (
              <div className="space-y-4">
                {transformedCalls.map((call) => (
                  <CallCard key={call.id} call={call} />
                ))}
              </div>
            ) : (
              <div className="bg-[#1A1A1A] border border-[#333] p-8 text-center">
                <p className="text-[#666]">No calls analyzed yet</p>
                <Link href="/call-lab">
                  <Button className="mt-4 bg-[#E51B23] hover:bg-[#FF2930]">
                    Analyze Your First Call
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <PatternIntelligence
              positivePatterns={positivePatterns}
              negativePatterns={negativePatterns}
              totalCalls={metrics.callsLast30}
            />

            <MomentumSection
              biggestWin={biggestWin}
              biggestFix={biggestFix}
              nextFocus={nextFocus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
