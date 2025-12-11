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
} from "@/components/dashboard";

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

  // Transform recent calls to new format
  const transformedCalls = recentCalls.map((call) => ({
    id: call.id,
    name: call.buyerName || "Unknown",
    company: call.companyName || undefined,
    date: new Date(call.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    score: call.score || 0,
    // Map primary pattern as negative (historically these were friction patterns)
    top_negative_pattern: call.primaryPattern
      ? {
          macro_name: call.primaryPattern,
          category: "connection" as const, // Default category
        }
      : undefined,
    // Use improvement highlight as the positive note
    next_step: call.improvementHighlight || undefined,
  }));

  // Transform pattern radar to pattern intelligence format
  // Note: The existing data structure has skills (Trust Velocity, Agenda Control, etc.)
  // not the new macro patterns. We'll show what's available.
  const positivePatterns = patternRadar.topStrengths.map((s, i) => ({
    macro_id: `strength_${i}`,
    macro_name: s.name,
    count: Math.round(s.current),
  }));

  const negativePatterns = patternRadar.topWeaknesses.map((w, i) => ({
    macro_id: `weakness_${i}`,
    macro_name: w.name,
    count: Math.round(100 - w.current), // Invert since low score = weakness
  }));

  // Calculate overall score from available metrics
  const overallScore = Math.round(metrics.skillImprovementIndex);
  const trustVelocity = Math.round(
    metrics.trustVelocityDelta > 0
      ? Math.min(100, 50 + metrics.trustVelocityDelta)
      : Math.max(0, 50 + metrics.trustVelocityDelta)
  );
  const closeDiscipline = Math.round(metrics.agendaStability);

  // Clean call rate: calls without high pattern density
  const cleanCallCount = Math.round(metrics.callsLast30 * ((100 - metrics.patternDensity) / 100));

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border border-[#E51B23] rounded-lg px-6 py-4">
          <div>
            <div className="font-anton text-3xl tracking-wide uppercase">
              <span className="text-white">SALES</span>
              <span className="text-[#E51B23]">OS</span>
            </div>
            <div className="font-anton text-xs text-[#FFDE59] uppercase mt-1">
              CALL LAB v1.0
            </div>
            <div className="mt-4">
              <h1 className="font-anton text-lg text-[#FFDE59] uppercase">
                Welcome back, {userName}
              </h1>
              <p className="text-[#B3B3B3] text-sm">{userEmail}</p>
            </div>
          </div>
          <Link href="/call-lab">
            <Button size="lg" className="bg-[#E51B23] hover:bg-[#C41820] font-anton uppercase">
              Analyze New Call
            </Button>
          </Link>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ScoreCard
            dimension="Overall Score"
            value={overallScore}
            max={100}
            description={`Average across ${metrics.callsLast30} calls`}
          />
          <ScoreCard
            dimension="Trust Velocity"
            value={trustVelocity}
            max={100}
            description="How fast you build trust"
          />
          <ScoreCard
            dimension="Close Discipline"
            value={closeDiscipline}
            max={100}
            description="Next step commitment rate"
          />
          <CleanCallRate
            clean_count={cleanCallCount}
            total_count={metrics.callsLast30}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Calls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
                Recent Calls
              </h2>
              <button className="text-[#B3B3B3] text-sm hover:text-white">
                View All
              </button>
            </div>

            {transformedCalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transformedCalls.map((call) => (
                  <CallCard key={call.id} call={call} />
                ))}
              </div>
            ) : (
              <div className="bg-black border border-[#333] rounded-lg p-8 text-center">
                <p className="text-[#666]">No calls analyzed yet</p>
                <Link href="/call-lab">
                  <Button className="mt-4 bg-[#E51B23] hover:bg-[#C41820]">
                    Analyze Your First Call
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right Column - Intelligence & Momentum */}
          <div className="space-y-6">
            <PatternIntelligence
              positivePatterns={positivePatterns}
              negativePatterns={negativePatterns}
              totalCalls={metrics.callsLast30}
            />

            <MomentumSection
              top_positive_pattern={
                patternRadar.mostImprovedSkill
                  ? {
                      macro_name: patternRadar.mostImprovedSkill,
                      frequency: Math.round(patternRadar.topStrengths[0]?.current || 0),
                      total_calls: metrics.callsLast30,
                      trend: "rising" as const,
                    }
                  : undefined
              }
              top_negative_pattern={
                patternRadar.mostFrequentMistake
                  ? {
                      macro_name: patternRadar.mostFrequentMistake,
                      frequency: Math.round(metrics.patternDensity),
                      total_calls: metrics.callsLast30,
                    }
                  : undefined
              }
              next_call_focus={quickInsights.nextAction || quickInsights.skillToPractice || undefined}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="bg-black border border-[#333] rounded-lg p-6">
            <h3 className="font-anton text-[#FFDE59] uppercase mb-2">Call Lab</h3>
            <p className="text-[#B3B3B3] text-sm mb-4">
              Get instant feedback on your sales calls
            </p>
            <Link href="/call-lab">
              <Button className="w-full bg-[#E51B23] hover:bg-[#C41820]">
                Launch Call Lab
              </Button>
            </Link>
          </div>

          <div className="bg-black border border-[#333] rounded-lg p-6">
            <h3 className="font-anton text-[#FFDE59] uppercase mb-2">Rep Trends</h3>
            <p className="text-[#B3B3B3] text-sm mb-4">
              Track your performance over time
            </p>
            <Button className="w-full bg-[#333] text-[#666]" disabled>
              Coming in Phase 2
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
