// Types for the Client Onboarding & Portal System

// ============================================
// PROGRAMS
// ============================================

export type ProgramSlug =
  | 'agency-studio'
  | 'agency-studio-plus'
  | 'salesos-studio'
  | 'salesos-growth'
  | 'salesos-team'
  | 'demandos-studio'
  | 'demandos-growth'
  | 'demandos-team';

export interface ClientProgram {
  id: string;
  slug: ProgramSlug;
  name: string;
  description: string | null;
  has_five_minute_friday: boolean;
  has_call_lab_pro: boolean;
  active: boolean;
}

// ============================================
// INVITES & ENROLLMENTS
// ============================================

export interface ClientInvite {
  id: string;
  email: string;
  full_name: string | null;
  program_id: string;
  role: 'primary' | 'team_member';
  invited_by: string | null;
  invite_token: string;
  status: 'pending' | 'accepted' | 'expired';
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined fields
  program?: ClientProgram;
}

export interface ClientEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  company_id: string | null;
  role: 'primary' | 'team_member';
  leads_sales_calls: boolean;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  onboarding_completed: boolean;
  timezone: string;
  enrolled_at: string;
  // Joined fields
  program?: ClientProgram;
  company?: ClientCompany;
}

// ============================================
// ONBOARDING FORM DATA
// ============================================

export interface ClientCompany {
  id: string;
  enrollment_id: string;
  company_name: string;
  url: string | null;
  industry_niche: string | null;
  hq_location: string | null;
  founded: number | null;
  team_size: number | null;
  revenue_range: string | null;
  notes: string | null;
}

export interface CompanyBasicsFormData {
  company_name: string;
  url?: string;
  industry_niche?: string;
  hq_location?: string;
  founded?: number;
  team_size?: number;
  revenue_range?: string;
}

export interface LeadershipContact {
  full_name: string;
  role: string;
  email?: string;
  linkedin_url?: string;
  is_decision_maker?: boolean;
  personality_notes?: string;
}

export interface LeadershipFormData {
  contacts: LeadershipContact[];
}

export interface TeamMember {
  name: string;
  role: string;
  linkedin_url?: string;
  strengths_notes?: string;
  capacity_contribution_score?: number;
}

export interface TeamFormData {
  members: TeamMember[];
}

export interface ServiceItem {
  service_name: string;
  description?: string;
  price_range?: string;
  delivery_model?: string;
  delivery_constraints?: string;
}

export interface ServicesFormData {
  services: ServiceItem[];
}

export interface PortfolioClient {
  client_name: string;
  industry?: string;
  monthly_value?: number;
  profitability_rating?: string;
  fit_rating?: number;
  duration_months?: number;
  churn_risk?: string;
  notes?: string;
}

export interface ClientsFormData {
  clients: PortfolioClient[];
}

export interface FinancialsFormData {
  revenue?: number;
  cost_of_delivery?: number;
  operating_costs?: number;
  target_revenue_goal?: number;
  target_profit_goal?: number;
}

export interface SalesProcessFormData {
  main_lead_sources?: string[];
  monthly_lead_volume?: number;
  request_to_meeting_rate?: number;
  meeting_to_proposal_rate?: number;
  proposal_to_close_rate?: number;
  sales_process_description?: string;
  outbound_tools?: string[];
  sales_positioning_summary?: string;
  visibility_score?: number;
}

export interface OpsCapacityFormData {
  hours_available_per_week?: number;
  hours_sold_per_week?: number;
  biggest_bottlenecks?: string;
  delivery_model?: string;
  sop_quality_rating?: number;
  team_capacity_risk?: string;
}

export interface CompetitorItem {
  competitor_name: string;
  url?: string;
  positioning_summary?: string;
  strengths?: string;
  weaknesses?: string;
  differentiation_opportunities?: string;
}

export interface CompetitorsFormData {
  competitors: CompetitorItem[];
}

export interface OnboardingFormData {
  company: CompanyBasicsFormData;
  leadership: LeadershipFormData;
  team: TeamFormData;
  services: ServicesFormData;
  clients: ClientsFormData;
  financials: FinancialsFormData;
  sales: SalesProcessFormData;
  ops: OpsCapacityFormData;
  competitors: CompetitorsFormData;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

export const CLIENT_ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'company', title: 'Company Basics', description: 'Core information about your business' },
  { id: 'leadership', title: 'Leadership Team', description: 'Decision makers and key stakeholders' },
  { id: 'team', title: 'Team Members', description: 'Your delivery team and their roles' },
  { id: 'services', title: 'Services & Offers', description: 'What you sell and how you deliver' },
  { id: 'clients', title: 'Client Portfolio', description: 'Your current client base' },
  { id: 'financials', title: 'Financials', description: 'Revenue, costs, and targets' },
  { id: 'sales', title: 'Sales & Lead Gen', description: 'How you generate and close business' },
  { id: 'ops', title: 'Operations & Capacity', description: 'Delivery capacity and constraints' },
  { id: 'competitors', title: 'Competitive Landscape', description: 'Who you compete against' },
  { id: 'review', title: 'Review & Submit', description: 'Confirm and submit your information' },
];

// ============================================
// FIVE MINUTE FRIDAY
// ============================================

export interface FiveMinuteFriday {
  id: string;
  user_id: string;
  enrollment_id: string;
  week_of: string;
  worked_on: string;
  working_on_next: string;
  concerned_about: string | null;
  happy_about: string | null;
  whats_in_the_way: string | null;
  submitted_at: string;
  created_at: string;
  // Joined
  responses?: FiveMinuteFridayResponse[];
}

export interface FiveMinuteFridayResponse {
  id: string;
  friday_id: string;
  responder_id: string | null;
  response_text: string;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface FiveMinuteFridaySubmission {
  worked_on: string;
  working_on_next: string;
  concerned_about?: string;
  happy_about?: string;
  whats_in_the_way?: string;
}

// ============================================
// CLIENT CONTENT
// ============================================

export type ContentType = 'text' | 'video' | 'deck' | 'pdf' | 'link';

export interface ClientContent {
  id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  content_url: string | null;
  content_body: string | null;
  thumbnail_url: string | null;
  program_ids: string[];
  sort_order: number;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

// ============================================
// CLIENT ROADMAPS
// ============================================

export interface ClientRoadmap {
  id: string;
  enrollment_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  created_at: string;
}

// ============================================
// SALES CALL ROLES (determines Call Lab Pro access)
// ============================================

export const SALES_CALL_ROLES = [
  'Founder',
  'CEO',
  'Co-Founder',
  'CRO',
  'VP Sales',
  'Head of Sales',
  'Sales Director',
  'Business Development',
  'Account Executive',
  'Sales Manager',
] as const;
