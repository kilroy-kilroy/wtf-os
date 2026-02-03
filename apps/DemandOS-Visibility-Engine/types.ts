
export interface Competitor {
  name: string;
  positioning: string;
  weakness: string;
  strength?: string; // Added for Battlecard
  threatLevel?: 'High' | 'Medium' | 'Low'; // Added for Battlecard
}

export interface ContentGap {
  topic: string;
  competitorNeglect: string; // Why competitors ignore this
  yourAdvantage: string; // Why YOU can win here
  opportunityScore: number; // 1-5
}

export interface VisibilityLeak {
  zone: string; // e.g. "YouTube Search", "Peer Slacks", "Review Sites"
  buyerBehavior: string; // "Prospects search 'Agency Name + Review'"
  brandStatus: string; // "You are invisible here."
  revenueRisk: 'Critical' | 'High' | 'Moderate';
}

export interface VVVAudit {
  vibes: string; // Analysis of the 'Vibe'
  vision: string; // Analysis of the 'Vision'
  values: string; // Analysis of the 'Values'
  clarityScore: number; // 1-10
}

// NEW: For Radar Chart
export interface RadarMetric {
  subject: string; // Clarity, Consistency, Frequency, Differentiation, Authority
  A: number; // Score 1-10
  fullMark: number;
}

// NEW: For Truth vs Fiction
export interface NarrativeDissonance {
  claim: string; // What they said in the form
  reality: string; // What Google/Website actually shows
  dissonanceScore: number; // 1-10 (10 = Total Lie, 1 = Accurate)
  label: string; // "Honest", "Exaggerated", "Delusional"
}

export interface ChannelStrategy {
  channel: string; // YouTube, Podcast, LinkedIn, Events
  topics: string[];
  frequency: string;
  teamExecution: string; // NEW: How different team roles (SME vs CEO) handle this
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
  visibilityScore: number; // 0-100
  brandArchetype: ArchetypeResult; 
  vvvAudit: VVVAudit; 
  vibeRadar: RadarMetric[]; // NEW
  narrativeDissonance: NarrativeDissonance; // NEW
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
  userPhone: string; // NEW
  userTitle: string; // NEW
  brandName: string;
  website: string;
  targetAudience: string;
  mainCompetitors: string;
  currentChannels: string;
}