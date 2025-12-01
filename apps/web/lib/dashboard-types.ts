export type TrendPoint = {
  date: string; // ISO
  value: number;
};

export type SkillTrend = {
  name: string;
  current: number;
  delta: number; // vs previous period
};

export type RecentCall = {
  id: string;
  createdAt: string;
  buyerName: string | null;
  companyName: string | null;
  score: number | null;
  primaryPattern: string | null;
  improvementHighlight: string | null;
  trustVelocity: number | null;
  agendaControl: number | null;
};

export type FollowUpTask = {
  id: string;
  label: string;
  dueAt: string | null;
  completed: boolean;
  callId: string | null;
};

export type PatternRadarData = {
  topStrengths: SkillTrend[];
  topWeaknesses: SkillTrend[];
  mostFrequentMistake: string | null;
  mostImprovedSkill: string | null;
  skills: SkillTrend[];
};

export type QuickInsights = {
  topQuote: string | null;
  missedMove: string | null;
  skillToPractice: string | null;
};

export type DashboardMetrics = {
  callsLast30: number;
  trustVelocityDelta: number;
  agendaStability: number;
  patternDensity: number;
  skillImprovementIndex: number;
};

export type ChartDataPoint = {
  date: string;
  value: number;
};

export type DashboardCharts = {
  trustVelocityTrend: ChartDataPoint[];
  agendaControlTrend: ChartDataPoint[];
  patternDensityTrend: ChartDataPoint[];
};

export type CoachingReport = {
  id: string;
  report_type: "weekly" | "monthly" | "quarterly";
  period_start: string;
  period_end: string;
  scores_aggregate?: {
    overall: number;
    trust_velocity: number;
  };
  created_at: string;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  patternRadar: PatternRadarData;
  recentCalls: RecentCall[];
  quickInsights: QuickInsights;
  followUps: FollowUpTask[];
  charts: DashboardCharts;
  coachingReports: CoachingReport[];
};
