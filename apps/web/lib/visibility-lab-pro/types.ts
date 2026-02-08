// Visibility Lab Pro - TypeScript interfaces
// Extended analysis types for the Pro tier

// --- INPUT TYPES ---

export interface VisibilityLabProInput {
  // Operator Identity (same as free)
  userName: string;
  userEmail: string;
  userPhone: string;
  userTitle: string;

  // Target Brand (same as free)
  brandName: string;
  website: string;

  // Market Context (same as free)
  targetAudience: string;
  mainCompetitors: string;
  currentChannels: string;

  // PRO: Business Context
  revenueRange: string;
  teamSize: string;
  businessModel: string;
  yearsInBusiness: string;

  // PRO: Growth Context
  growthGoal: string;
  clientAcquisition: string;
  contentCapacity: string;

  // PRO: Operator Context
  linkedInUrl: string;
}

// --- OUTPUT TYPES ---

export interface KVIScore {
  score: number;
  evidence: string;
}

export interface KilroyVisibilityIndex {
  searchVisibility: KVIScore;
  socialAuthority: KVIScore;
  contentVelocity: KVIScore;
  darkSocialPenetration: KVIScore;
  competitiveShareOfVoice: KVIScore;
  founderSignalStrength: KVIScore;
  compositeScore: number;
}

export interface OperatorArchetype {
  name: string;
  reasoning: string;
  strengths: string[];
  risks: string[];
}

export interface NarrativeForensics {
  overallConsistencyScore: number;
  websiteVsLinkedIn: {
    finding: string;
    alignmentScore: number;
  };
  claimVsReality: {
    claim: string;
    reality: string;
    dissonanceScore: number;
    label: string;
  };
  founderVsBrand: {
    finding: string;
    alignmentScore: number;
  };
  messageDrift: string;
}

export interface BuyerJourneyStage {
  stage: string;
  description: string;
  visibilityGrade: string;
  whereProspectsLook: string[];
  brandPresence: string;
  revenueAtRisk: string;
}

export interface CompetitorWarRoomEntry {
  name: string;
  archetype: string;
  positioning: string;
  weakness: string;
  strength: string;
  threatLevel: 'High' | 'Medium' | 'Low';
  threatTrajectory: 'Rising' | 'Stable' | 'Declining';
  kviComparison: {
    dimension: string;
    them: number;
    you: number;
  }[];
  counterPositioning: string;
}

export interface ContentIntelligenceItem {
  topic: string;
  format: string;
  competitorNeglect: string;
  yourAngle: string;
  opportunityScore: number;
  repurposingChain: string[];
  searchVolume: string;
}

export interface OperatorProfile {
  personalBrandScore: number;
  linkedInStrength: string;
  speakingPresence: string;
  contentAuthority: string;
  authoritySignals: string[];
  networkVisibility: string;
  founderDependencyRisk: string;
  operatorArchetype: OperatorArchetype;
}

export interface BattlePlanItem {
  week: string;
  focus: string;
  tasks: string[];
  impact: 'High' | 'Medium' | 'Low';
  kviImpact: string;
  resourceLevel: string;
}

export interface ChannelCalendar {
  channel: string;
  cadence: string;
  topics: string[];
  teamExecution: string;
  specificTargets: string[];
  quickWin: string;
}

export interface KilroyHotTake {
  vibeScore: number;
  vibeCommentary: string;
  theOneThing: string;
  whatNobodyWillTellYou: string;
  prognosis: {
    doNothing: string;
    executeWell: string;
  };
}

export interface VisibilityLabProReport {
  // Meta
  brandName: string;
  operatorName: string;
  generatedAt: string;
  tier: 'pro';

  // Executive Diagnosis
  executiveSummary: string;
  diagnosisSeverity: 'Critical' | 'Serious' | 'Moderate' | 'Healthy';

  // Kilroy Visibility Index (6 dimensions)
  kvi: KilroyVisibilityIndex;

  // Brand Archetype (from DemandOS list)
  brandArchetype: {
    name: string;
    reasoning: string;
  };

  // Narrative Forensics (expanded dissonance)
  narrativeForensics: NarrativeForensics;

  // Buyer Journey Visibility Map
  buyerJourney: BuyerJourneyStage[];

  // Competitor War Room
  competitorWarRoom: CompetitorWarRoomEntry[];

  // Content Intelligence Engine
  contentIntelligence: ContentIntelligenceItem[];

  // Operator Visibility Profile
  operatorProfile: OperatorProfile;

  // Core Strengths (Unfair Advantages)
  coreStrengths: string[];

  // Channel Calendars (DemandOS Execution)
  channelCalendars: ChannelCalendar[];

  // 90-Day Battle Plan (Pro Edition)
  ninetyDayBattlePlan: BattlePlanItem[];

  // Kilroy's Hot Take
  kilroyHotTake: KilroyHotTake;
}
