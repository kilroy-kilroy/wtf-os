export interface Competitor {
  name: string;
  positioning: string;
  weakness: string;
  strength?: string;
  threatLevel?: 'High' | 'Medium' | 'Low';
}

export interface ContentGap {
  topic: string;
  competitorNeglect: string;
  yourAdvantage: string;
  opportunityScore: number;
}

export interface VisibilityLeak {
  zone: string;
  buyerBehavior: string;
  brandStatus: string;
  revenueRisk: 'Critical' | 'High' | 'Moderate';
}

export interface VVVAudit {
  vibes: string;
  vision: string;
  values: string;
  clarityScore: number;
}

export interface RadarMetric {
  subject: string;
  A: number;
  fullMark: number;
}

export interface NarrativeDissonance {
  claim: string;
  reality: string;
  dissonanceScore: number;
  label: string;
}

export interface ChannelStrategy {
  channel: string;
  topics: string[];
  frequency: string;
  teamExecution: string;
  specificTargets: string[];
}

export interface ActionPlanItem {
  week: string;
  focus: string;
  tasks: string[];
  impact: 'High' | 'Medium' | 'Low';
}

export interface ArchetypeResult {
  name: string;
  reasoning: string;
}

export interface AnalysisReport {
  brandName: string;
  executiveSummary: string;
  visibilityScore: number;
  brandArchetype: ArchetypeResult;
  vvvAudit: VVVAudit;
  vibeRadar: RadarMetric[];
  narrativeDissonance: NarrativeDissonance;
  coreStrengths: string[];
  visibilityLeaks: VisibilityLeak[];
  competitors: Competitor[];
  contentGaps: ContentGap[];
  youtubeStrategy: ChannelStrategy;
  podcastStrategy: ChannelStrategy;
  eventStrategy: ChannelStrategy;
  ninetyDayPlan: ActionPlanItem[];
}

export interface AnalysisInput {
  userName: string;
  userEmail: string;
  userPhone: string;
  userTitle: string;
  brandName: string;
  website: string;
  targetAudience: string;
  mainCompetitors: string;
  currentChannels: string;
}
