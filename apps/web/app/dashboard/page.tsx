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
  getNegativePatterns,
  MacroPattern,
} from "@/lib/macro-patterns";

// Mock data generator for demo purposes
// In production, this would come from the database
function generateDashboardData(userId: string) {
  // Simulate pattern data based on the 18 canonical patterns
  const patternData = MACRO_PATTERNS.map((pattern) => {
    const isNegative = pattern.polarity === "negative";
    // Negative patterns should appear less if the rep is good
    const baseFrequency = isNegative ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 6) + 2;
    const trends = ["up", "down", "stable"] as const;

    return {
      patternId: pattern.id,
      frequency: baseFrequency,
      totalCalls: 8,
      trend: trends[Math.floor(Math.random() * 3)],
      representativeQuote: isNegative && baseFrequency > 0
        ? "Let me walk you through everything we offer..."
        : undefined,
      coachingNote: baseFrequency > 3
        ? `This pattern appeared in ${baseFrequency} of your last 8 calls.`
        : undefined,
    };
  });

  // Find the most frequent negative pattern for Next Call Focus
  const negativePatterns = getNegativePatterns();
  const negativePatternData = patternData.filter((d) => {
    const pattern = getPatternById(d.patternId);
    return pattern?.polarity === "negative" && d.frequency > 0;
  });

  // Sort by frequency to find the worst offender
  negativePatternData.sort((a, b) => b.frequency - a.frequency);
  const worstPattern = negativePatternData[0];
  const worstPatternInfo = worstPattern ? getPatternById(worstPattern.patternId) : negativePatterns[0];

  // Generate momentum data
  const improvedPattern = MACRO_PATTERNS.find((p) => p.id === "diagnostic_reveal");
  const regressedPattern = MACRO_PATTERNS.find((p) => p.id === "soft_close_fade");

  // Generate follow-up items for calls with weak closes
  const followUpItems = [
    {
      callId: "call-001",
      callName: "Sarah Chen - TechCorp",
      riskNote: "Call ended with 'I\'ll send some info' - no concrete next step committed.",
      recommendedFollowUp: "Send a recap email with specific time options for follow-up call. Reference the pain point about Q4 deadlines.",
    },
  ];

  return {
    patternData,
    nextCallFocus: worstPatternInfo
      ? {
          pattern: worstPatternInfo,
          whyCostingDeals:
            worstPatternInfo.id === "soft_close_fade"
              ? "Ending calls without specific next steps leaves deals in limbo. Prospects lose urgency and momentum dies."
              : worstPatternInfo.id === "advice_avalanche"
              ? "Giving away too much consulting for free eliminates the prospect's need to hire you. They got the value without the contract."
              : worstPatternInfo.id === "scenic_route"
              ? "Extended small talk burns through the prospect's attention budget before you've established value."
              : worstPatternInfo.description,
          correctiveMove:
            worstPatternInfo.correctiveMove ||
            "Focus on this pattern in your next call.",
          exampleLanguage:
            worstPatternInfo.id === "soft_close_fade"
              ? "Based on what we discussed, I'd recommend we schedule a 30-minute deep dive for Tuesday at 2pm. Does that work?"
              : undefined,
        }
      : null,
    momentum: {
      mostImproved: improvedPattern
        ? {
            pattern: improvedPattern,
            changeSinceLastPeriod: 15,
            explanation:
              "You're asking better diagnostic questions that uncover real pain points.",
          }
        : undefined,
      mostRegressed: regressedPattern
        ? {
            pattern: regressedPattern,
            changeSinceLastPeriod: -12,
            explanation:
              "Recent calls have ended with vague next steps instead of concrete commitments.",
          }
        : undefined,
      hasEnoughData: true,
    },
    recentCalls: [
      {
        id: "call-001",
        buyerName: "Sarah Chen",
        companyName: "TechCorp",
        date: "Dec 12, 2024",
        score: 72,
        highlightedPattern: {
          pattern: MACRO_PATTERNS.find((p) => p.id === "diagnostic_reveal")!,
          isPositive: true,
        },
        coachingNote: "Strong discovery but missed the close opportunity at 18:42.",
      },
      {
        id: "call-002",
        buyerName: "Mike Rodriguez",
        companyName: "GrowthCo",
        date: "Dec 11, 2024",
        score: 65,
        highlightedPattern: {
          pattern: MACRO_PATTERNS.find((p) => p.id === "advice_avalanche")!,
          isPositive: false,
        },
        coachingNote: "Gave away the entire strategy before establishing value.",
      },
      {
        id: "call-003",
        buyerName: "Jennifer Walsh",
        companyName: "ScaleUp Inc",
        date: "Dec 10, 2024",
        score: 81,
        highlightedPattern: {
          pattern: MACRO_PATTERNS.find((p) => p.id === "permission_builder")!,
          isPositive: true,
        },
        coachingNote: "Excellent progression through micro-commitments.",
      },
      {
        id: "call-004",
        buyerName: "David Park",
        companyName: "Venture Labs",
        date: "Dec 9, 2024",
        score: 58,
        highlightedPattern: {
          pattern: MACRO_PATTERNS.find((p) => p.id === "passenger")!,
          isPositive: false,
        },
        coachingNote: "Let the prospect drive the entire conversation.",
      },
    ],
    followUpItems,
    coachingNarrative:
      "Recent calls show strong rapport building and solid diagnostic skills, but there's a recurring pattern of weak closes. The Soft Close Fade is appearing in 3 of your last 8 calls. Focus on building permission throughout the call so closing feels natural, not forced.",
    metrics: {
      callsInRange: 8,
      overallScore: 71,
      trendVsPrevious: 4,
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
    user.user_metadata?.first_name ||
    user.email?.split("@")[0] ||
    "there";

  // Get dashboard data
  const data = generateDashboardData(user.id);

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
              <Link href="/settings" className="hover:text-white transition-colors">
                Settings
              </Link>
              <span>•</span>
              <Link href="/labs" className="hover:text-white transition-colors">
                All Labs
              </Link>
              <span>•</span>
              <span>tim@timkilroy.com</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
