'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LabelWithTooltip, InfoTooltip } from '@/components/ui/info-tooltip';
import { dashboardTooltips } from '@/lib/tooltip-content';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

// Mock data for demonstration - in production, this would come from API
const mockMetrics = {
  trustVelocity: { value: 72, trend: 'up' as const, change: '+8%' },
  agendaControl: { value: 65, trend: 'up' as const, change: '+12%' },
  patternFriction: { value: 3.2, trend: 'down' as const, change: '-15%' },
  skillImprovement: { value: 78, trend: 'up' as const, change: '+5' },
};

const mockQuickInsights = {
  buyerMoment: '"Look, I\'ve been putting this off for months... but you\'re making me realize we can\'t wait anymore."',
  sharpMove: 'You paused after the objection and let them fill the silence. They revealed their real concern.',
  blindSpot: 'Jumping to solutions before fully exploring impact. Happened 3 times this call.',
};

const mockPatternRadar = [
  { pattern: 'Scenic Route', frequency: 45 },
  { pattern: 'Generous Professor', frequency: 30 },
  { pattern: 'Premature Prescription', frequency: 25 },
  { pattern: 'Weak Close', frequency: 20 },
  { pattern: 'Problem Orgy', frequency: 15 },
];

const mockRecentCalls = [
  { id: 1, date: '2024-01-15', prospect: 'Acme Corp', score: 82, pattern: 'Scenic Route', improvement: 'Tighten gap deepening' },
  { id: 2, date: '2024-01-14', prospect: 'TechStart Inc', score: 71, pattern: 'Generous Giveaway', improvement: 'Hold prescription until impact' },
  { id: 3, date: '2024-01-13', prospect: 'Global Services', score: 88, pattern: 'None detected', improvement: 'Strengthen close commitment' },
  { id: 4, date: '2024-01-12', prospect: 'DataFlow Labs', score: 65, pattern: 'Weak Close', improvement: 'Create urgency earlier' },
];

const mockFollowUps = [
  { id: 1, prospect: 'Acme Corp', commitment: 'Send case study by Friday', dueDate: '2024-01-19' },
  { id: 2, prospect: 'TechStart Inc', commitment: 'Schedule demo with technical team', dueDate: '2024-01-17' },
  { id: 3, prospect: 'Global Services', commitment: 'Proposal draft review', dueDate: '2024-01-20' },
];

function TrendIndicator({ trend, change }: { trend: 'up' | 'down' | 'neutral'; change: string }) {
  const icons = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    neutral: <Minus className="h-4 w-4 text-gray-500" />,
  };

  const colors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <div className={`flex items-center gap-1 ${colors[trend]}`}>
      {icons[trend]}
      <span className="text-sm">{change}</span>
    </div>
  );
}

function MetricCard({
  label,
  tooltip,
  value,
  unit = '',
  trend,
  change,
  highlight = false,
  invertTrend = false,
}: {
  label: string;
  tooltip: string;
  value: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'neutral';
  change: string;
  highlight?: boolean;
  invertTrend?: boolean;
}) {
  // For metrics like Pattern Friction, down is good
  const displayTrend = invertTrend
    ? trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'neutral'
    : trend;

  return (
    <Card className={highlight ? 'border-[#E51B23]' : ''}>
      <CardHeader className="pb-2">
        <LabelWithTooltip
          label={label}
          tooltip={tooltip}
          labelClassName="text-sm font-medium text-muted-foreground"
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">
            {value}
            {unit && <span className="text-lg font-normal text-muted-foreground">{unit}</span>}
          </div>
          <TrendIndicator trend={displayTrend} change={change} />
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  label,
  tooltip,
  content,
  variant = 'default',
}: {
  label: string;
  tooltip: string;
  content: string;
  variant?: 'default' | 'success' | 'warning';
}) {
  const borderColors = {
    default: 'border-l-[#666666]',
    success: 'border-l-green-500',
    warning: 'border-l-[#FFDE59]',
  };

  return (
    <div className={`bg-card rounded-lg p-4 border-l-4 ${borderColors[variant]}`}>
      <LabelWithTooltip
        label={label}
        tooltip={tooltip}
        labelClassName="text-sm font-semibold text-muted-foreground mb-2 block"
        className="mb-2"
      />
      <p className="text-sm text-foreground italic">{content}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-300 mt-2">
              Your sales performance at a glance
            </p>
          </div>
          <Link href="/call-lab">
            <Button size="lg">
              Analyze New Call
            </Button>
          </Link>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label={dashboardTooltips.trustVelocity.label}
            tooltip={dashboardTooltips.trustVelocity.tooltip}
            value={mockMetrics.trustVelocity.value}
            trend={mockMetrics.trustVelocity.trend}
            change={mockMetrics.trustVelocity.change}
            highlight
          />
          <MetricCard
            label={dashboardTooltips.agendaControl.label}
            tooltip={dashboardTooltips.agendaControl.tooltip}
            value={mockMetrics.agendaControl.value}
            trend={mockMetrics.agendaControl.trend}
            change={mockMetrics.agendaControl.change}
          />
          <MetricCard
            label={dashboardTooltips.patternFriction.label}
            tooltip={dashboardTooltips.patternFriction.tooltip}
            value={mockMetrics.patternFriction.value}
            trend={mockMetrics.patternFriction.trend}
            change={mockMetrics.patternFriction.change}
            invertTrend
          />
          <MetricCard
            label={dashboardTooltips.skillImprovementIndex.label}
            tooltip={dashboardTooltips.skillImprovementIndex.tooltip}
            value={mockMetrics.skillImprovement.value}
            unit="/100"
            trend={mockMetrics.skillImprovement.trend}
            change={mockMetrics.skillImprovement.change}
          />
        </div>

        {/* Quick Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>Key moments from your recent calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InsightCard
              label={dashboardTooltips.quickInsights.buyerMoment.label}
              tooltip={dashboardTooltips.quickInsights.buyerMoment.tooltip}
              content={mockQuickInsights.buyerMoment}
              variant="success"
            />
            <InsightCard
              label={dashboardTooltips.quickInsights.sharpMove.label}
              tooltip={dashboardTooltips.quickInsights.sharpMove.tooltip}
              content={mockQuickInsights.sharpMove}
              variant="success"
            />
            <InsightCard
              label={dashboardTooltips.quickInsights.blindSpot.label}
              tooltip={dashboardTooltips.quickInsights.blindSpot.tooltip}
              content={mockQuickInsights.blindSpot}
              variant="warning"
            />
          </CardContent>
        </Card>

        {/* Pattern Radar & Most Frequent/Improved */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <LabelWithTooltip
                label={dashboardTooltips.patternRadar.label}
                tooltip={dashboardTooltips.patternRadar.tooltip}
                as="h3"
                labelClassName="text-lg font-semibold"
              />
              <CardDescription>Friction patterns across your last 10 calls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockPatternRadar.map((item) => (
                  <div key={item.pattern} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate">{item.pattern}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-[#E51B23] rounded-full transition-all duration-500"
                        style={{ width: `${item.frequency}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{item.frequency}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <LabelWithTooltip
                  label={dashboardTooltips.mostFrequentPattern.label}
                  tooltip={dashboardTooltips.mostFrequentPattern.tooltip}
                  labelClassName="text-sm font-medium text-muted-foreground"
                />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-[#E51B23]">Scenic Route</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Appeared in 45% of recent calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <LabelWithTooltip
                  label={dashboardTooltips.mostImprovedSkill.label}
                  tooltip={dashboardTooltips.mostImprovedSkill.tooltip}
                  labelClassName="text-sm font-medium text-muted-foreground"
                />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-500">Gap Deepening</p>
                <p className="text-sm text-muted-foreground mt-1">
                  +23% improvement over 8 calls
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Weekly Coaching Focus */}
        <Card className="border-[#FFDE59] bg-gradient-to-r from-[#FFDE59]/10 to-transparent">
          <CardHeader>
            <LabelWithTooltip
              label={dashboardTooltips.weeklyFocus.label}
              tooltip={dashboardTooltips.weeklyFocus.tooltip}
              as="h3"
              labelClassName="text-lg font-semibold text-[#FFDE59]"
            />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              Focus on holding the gap longer before prescribing. Your best calls this week came when you let the buyer sit with the problem.
            </p>
          </CardContent>
        </Card>

        {/* Recent Calls Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Recent Calls</CardTitle>
              <InfoTooltip content={dashboardTooltips.recentCalls.tooltip} />
            </div>
            <CardDescription>Your call analysis history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Prospect</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Score
                        <InfoTooltip content={dashboardTooltips.recentCalls.score} />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Pattern
                        <InfoTooltip content={dashboardTooltips.recentCalls.pattern} />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Next Improvement
                        <InfoTooltip content={dashboardTooltips.recentCalls.improvementItem} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockRecentCalls.map((call) => (
                    <tr key={call.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-sm">{call.date}</td>
                      <td className="py-3 px-4 text-sm font-medium">{call.prospect}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-bold ${call.score >= 80 ? 'text-green-500' : call.score >= 70 ? 'text-[#FFDE59]' : 'text-[#E51B23]'}`}>
                          {call.score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{call.pattern}</td>
                      <td className="py-3 px-4 text-sm">{call.improvement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Follow Ups & Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Follow Ups */}
          <Card>
            <CardHeader>
              <LabelWithTooltip
                label={dashboardTooltips.followUps.label}
                tooltip={dashboardTooltips.followUps.tooltip}
                as="h3"
                labelClassName="text-lg font-semibold"
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFollowUps.map((followUp) => (
                  <div key={followUp.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <ArrowRight className="h-5 w-5 text-[#E51B23] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{followUp.commitment}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {followUp.prospect} &bull; Due: {followUp.dueDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Your metrics over the last 20 calls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <LabelWithTooltip
                  label={dashboardTooltips.trends.trustVelocity.label}
                  tooltip={dashboardTooltips.trends.trustVelocity.tooltip}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  className="mb-2"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                  <TrendIndicator trend="up" change="+8%" />
                </div>
              </div>

              <div>
                <LabelWithTooltip
                  label={dashboardTooltips.trends.agendaControl.label}
                  tooltip={dashboardTooltips.trends.agendaControl.tooltip}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  className="mb-2"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="h-full bg-[#FFDE59] rounded-full" style={{ width: '65%' }} />
                  </div>
                  <TrendIndicator trend="up" change="+12%" />
                </div>
              </div>

              <div>
                <LabelWithTooltip
                  label={dashboardTooltips.trends.patternFriction.label}
                  tooltip={dashboardTooltips.trends.patternFriction.tooltip}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  className="mb-2"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="h-full bg-[#E51B23] rounded-full" style={{ width: '32%' }} />
                  </div>
                  <TrendIndicator trend="up" change="-15%" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Identity */}
        <Card>
          <CardHeader>
            <LabelWithTooltip
              label={dashboardTooltips.salesIdentity.label}
              tooltip={dashboardTooltips.salesIdentity.tooltip}
              as="h3"
              labelClassName="text-lg font-semibold"
            />
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-[#E51B23]/10 to-[#FFDE59]/10 rounded-lg p-6">
              <h4 className="text-xl font-bold mb-2">The Diagnostic Closer</h4>
              <p className="text-muted-foreground">
                You excel at deep problem exploration and building genuine understanding. Your natural curiosity creates safety,
                but you sometimes stay in diagnosis too long. Your strongest moments come when you connect problems to clear consequences.
                Work on transitioning from understanding to prescription with more confidence.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Lab Lite</CardTitle>
              <CardDescription>
                Get instant feedback on your sales calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/call-lab">
                <Button className="w-full">Launch Call Lab Lite</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call Lab Pro</CardTitle>
              <CardDescription>
                Advanced pattern analysis and methodology scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/call-lab-pro">
                <Button className="w-full" variant="outline">
                  Upgrade to Pro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
