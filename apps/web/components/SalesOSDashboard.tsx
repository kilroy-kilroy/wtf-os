"use client";

import { DashboardData } from "@/lib/dashboard-types";
import { MetricCard, TrendMetricCard } from "./metric-cards";
import { PatternRadar } from "./pattern-radar";
import { RecentCallsList } from "./recent-calls";
import { QuickInsightsPanel } from "./quick-insights";
import { TrustVelocityChart, AgendaControlChart, PatternDensityChart } from "./charts";
import { CoachingTimeline } from "./coaching-timeline";
import { MethodologyAlignment } from "./methodology-alignment";
import { dashboardTooltips } from "@/lib/tooltip-content";
import { InfoTooltip } from "@/components/ui/info-tooltip";

type Props = {
  userName: string;
  userEmail: string;
  data: DashboardData;
};

export function SalesOSDashboard({ userName, userEmail, data }: Props) {
  const { metrics, patternRadar, recentCalls, quickInsights, charts, coachingReports } = data;

  return (
    <div className="min-h-screen bg-black py-8 px-4 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-start justify-between border border-[#E51B23] rounded-lg px-6 py-4">
          <div>
            <div className="font-anton text-3xl tracking-wide uppercase">
              <span className="text-white">SALES</span>
              <span className="text-[#E51B23]">OS</span>
            </div>
            <div className="font-anton text-xs text-[#FFDE59] uppercase mt-1">
              CALL LAB v1.0
            </div>
            <div className="mt-4">
              <div className="font-anton text-lg text-[#FFDE59] uppercase">
                Welcome back, {userName}
              </div>
              <div className="text-sm text-[#B3B3B3]">{userEmail}</div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-black border border-[#333] px-3 py-1.5 rounded">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-anton text-[10px] text-white uppercase">
                SYS_READY
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="font-anton text-xs uppercase border border-[#FFDE59] text-[#FFDE59] px-3 py-1 rounded hover:bg-[#FFDE59] hover:text-black transition">
                Solo plan
              </button>
              <button className="font-anton text-xs uppercase border border-[#FFDE59] text-black bg-[#FFDE59] px-3 py-1 rounded hover:bg-[#E5C640] transition">
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Momentum strip */}
        <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-3">
          <h2 className="font-anton text-lg md:text-xl uppercase tracking-wide text-[#FFDE59]">
            Your sales momentum
          </h2>
          <p className="text-sm text-[#B3B3B3]">
            Here is what changed since your last call.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-2">
            <MetricCard
              label="Strongest skill right now"
              value={patternRadar.topStrengths[0]?.name ?? "Not enough data yet"}
              helper={
                patternRadar.topStrengths[0]
                  ? `${patternRadar.topStrengths[0].delta.toFixed(1)} change recently`
                  : "Analyze a few calls to unlock this."
              }
              icon="🔥"
              tooltip={dashboardTooltips.mostImprovedSkill.tooltip}
              isPatternValue={!!patternRadar.topStrengths[0]}
            />
            <MetricCard
              label="Weakest link"
              value={patternRadar.topWeaknesses[0]?.name ?? "Not enough data yet"}
              helper={
                patternRadar.mostFrequentMistake ??
                "Once we see patterns, we will highlight your biggest leverage point."
              }
              icon="⚠️"
              tooltip={dashboardTooltips.mostFrequentPattern.tooltip}
              isPatternValue={!!patternRadar.topWeaknesses[0]}
            />
            <MetricCard
              label="Next call focus"
              value={quickInsights.skillToPractice ?? "Run a new call through Call Lab Pro"}
              helper={quickInsights.nextAction ?? "We will pin a specific move after your next analysis."}
              icon="🎯"
              tooltip={dashboardTooltips.weeklyFocus.tooltip}
              isPatternValue={!!quickInsights.skillToPractice}
            />
          </div>
        </section>

        {/* Metrics row */}
        <section className="grid md:grid-cols-5 gap-4">
          <MetricCard
            label="Calls analyzed"
            value={metrics.callsLast30.toString()}
            helper="Last 30 days"
          />
          <TrendMetricCard
            label="Trust velocity"
            valueChange={metrics.trustVelocityDelta}
            helper="Change vs previous 30 days"
            tooltip={dashboardTooltips.trustVelocity.tooltip}
          />
          <MetricCard
            label="Agenda control"
            value={`${metrics.agendaStability.toFixed(0)}`}
            helper="Stability score (consistency)"
            tooltip={dashboardTooltips.agendaControl.tooltip}
          />
          <MetricCard
            label="Red flag frequency"
            value={metrics.patternDensity.toFixed(0)}
            helper="Lower is better"
            tooltip={dashboardTooltips.patternFriction.tooltip}
          />
          <MetricCard
            label="Skill improvement index"
            value={metrics.skillImprovementIndex.toFixed(0)}
            helper="Higher is better"
            tooltip={dashboardTooltips.skillImprovementIndex.tooltip}
          />
        </section>

        {/* Trend Charts */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <InfoTooltip content={dashboardTooltips.trends.trustVelocity.tooltip} />
            </div>
            <TrustVelocityChart data={charts.trustVelocityTrend} />
          </div>
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <InfoTooltip content={dashboardTooltips.trends.agendaControl.tooltip} />
            </div>
            <AgendaControlChart data={charts.agendaControlTrend} />
          </div>
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <InfoTooltip content={dashboardTooltips.trends.patternFriction.tooltip} />
            </div>
            <PatternDensityChart data={charts.patternDensityTrend} />
          </div>
        </section>

        {/* Middle band: pattern radar + quick insights */}
        <section className="grid lg:grid-cols-[2fr,1fr] gap-6">
          <div className="relative">
            <div className="absolute top-4 right-4 z-10">
              <InfoTooltip content={dashboardTooltips.patternRadar.tooltip} />
            </div>
            <PatternRadar data={patternRadar} />
          </div>
          <div className="space-y-4">
            <QuickInsightsPanel insights={quickInsights} />
          </div>
        </section>

        {/* Recent calls */}
        <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-anton text-lg md:text-xl uppercase tracking-wide text-[#FFDE59]">
                Recent calls
              </h2>
              <InfoTooltip content={dashboardTooltips.recentCalls.tooltip} />
            </div>
            <a
              href="/call-lab/new"
              className="font-anton text-xs uppercase bg-[#E51B23] text-white px-4 py-2 rounded hover:bg-[#C41820] transition"
            >
              ▶ Analyze a call
            </a>
          </div>

          <RecentCallsList calls={recentCalls} />
        </section>

        {/* Coaching Timeline */}
        <CoachingTimeline reports={coachingReports} />

        {/* Methodology Alignment (collapsed by default) */}
        <MethodologyAlignment />
      </div>
    </div>
  );
}
