// ═══════════════════════════════════════════════════════════════════════════
// PATTERN TYPES
// Conversational pattern capture for Call Lab and related tools
// ═══════════════════════════════════════════════════════════════════════════

export type PatternCategory =
  | "rapport"
  | "problem_depth"
  | "decision_model"
  | "narrative"
  | "delivery"
  | "positioning"
  | "followup"
  | "scope_alignment";

export type PatternSeverity = "low" | "medium" | "high" | "critical";

export type CompatibleTool =
  | "calllab"
  | "discoverylab"
  | "anglelab"
  | "contentlab"
  | "proposalbuilder";

export interface Pattern {
  pattern_id: string;
  name: string;
  category: PatternCategory;
  subcategory?: string;
  definition: string;
  indicators?: string[];
  examples?: string[];
  recommended_fix?: string;
  severity?: PatternSeverity;
  compatible_tools?: CompatibleTool[];
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface PatternInput {
  name: string;
  category: PatternCategory;
  subcategory?: string;
  definition: string;
  indicators?: string[];
  examples?: string[];
  recommended_fix?: string;
  severity?: PatternSeverity;
  compatible_tools?: CompatibleTool[];
  version?: number;
}

export interface PatternFilters {
  category?: PatternCategory;
  subcategory?: string;
  severity?: PatternSeverity;
  compatible_tools?: CompatibleTool | CompatibleTool[];
  name?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API ACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PatternAction =
  | UpsertPatternAction
  | GetPatternsAction
  | UpdatePatternAction
  | BatchInsertAction
  | DeletePatternAction;

export interface UpsertPatternAction {
  action: "upsert_pattern";
  pattern: PatternInput;
}

export interface GetPatternsAction {
  action: "get_patterns";
  filters?: PatternFilters;
}

export interface UpdatePatternAction {
  action: "update_pattern";
  pattern_id: string;
  updates: Partial<PatternInput>;
}

export interface BatchInsertAction {
  action: "batch_insert";
  patterns: PatternInput[];
}

export interface DeletePatternAction {
  action: "delete_pattern";
  pattern_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PatternResponse {
  status: "ok";
  action: string;
  pattern?: Pattern;
  patterns?: Pattern[];
  count?: number;
  inserted?: number;
  deleted?: string;
}

export interface PatternErrorResponse {
  error: string;
  details?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY METADATA
// ═══════════════════════════════════════════════════════════════════════════

export const PATTERN_CATEGORIES: Record<PatternCategory, { label: string; description: string }> = {
  rapport: {
    label: "Rapport",
    description: "Building trust and connection with the buyer",
  },
  problem_depth: {
    label: "Problem Depth",
    description: "Exploring pain points and root causes",
  },
  decision_model: {
    label: "Decision Model",
    description: "Understanding how buying decisions are made",
  },
  narrative: {
    label: "Narrative",
    description: "Storytelling and framing the conversation",
  },
  delivery: {
    label: "Delivery",
    description: "How information is communicated",
  },
  positioning: {
    label: "Positioning",
    description: "Differentiating and establishing value",
  },
  followup: {
    label: "Follow-up",
    description: "Next steps and momentum building",
  },
  scope_alignment: {
    label: "Scope Alignment",
    description: "Matching solution to buyer needs",
  },
};

export const SEVERITY_LEVELS: Record<PatternSeverity, { label: string; color: string }> = {
  low: { label: "Low", color: "#666666" },
  medium: { label: "Medium", color: "#FFDE59" },
  high: { label: "High", color: "#FF9500" },
  critical: { label: "Critical", color: "#E51B23" },
};

export const COMPATIBLE_TOOLS: Record<CompatibleTool, { label: string }> = {
  calllab: { label: "Call Lab" },
  discoverylab: { label: "Discovery Lab" },
  anglelab: { label: "Angle Lab" },
  contentlab: { label: "Content Lab" },
  proposalbuilder: { label: "Proposal Builder" },
};
