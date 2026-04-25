// apps/web/lib/demandos-intake/questions.ts

export type QuestionType =
  | 'short-text'
  | 'long-text'
  | 'single-select'
  | 'multi-select'
  | 'number'
  | 'url'
  | 'upload';

export type Question = {
  key: string;
  section: string;
  label: string;
  help?: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  uploadCategory?: string;
};

export type SectionDef = {
  slug: string;
  title: string;
};

export const SECTIONS: ReadonlyArray<SectionDef> = [
  { slug: 'company', title: 'Company & offer' },
  { slug: 'icp', title: 'Your definition of ICP' },
  { slug: 'gtm', title: 'Current GTM motion' },
  { slug: 'pipeline', title: 'Pipeline snapshot — last 90 days' },
  { slug: 'content', title: 'Positioning & content' },
  { slug: 'stack', title: 'Tech stack' },
  { slug: 'team', title: 'Team & access' },
  { slug: 'goals', title: 'Goals & constraints' },
  { slug: 'history', title: "What you've tried" },
];

export const QUESTIONS: ReadonlyArray<Question> = [
  // company
  { key: 'company_name', section: 'company', type: 'short-text', required: true, label: 'Company name' },
  { key: 'company_url', section: 'company', type: 'url', required: true, label: 'Website URL' },
  { key: 'company_one_liner', section: 'company', type: 'long-text', required: true, label: 'One sentence: what you do and for whom' },
  { key: 'offer_description', section: 'company', type: 'long-text', required: true, label: 'What do you sell and how is it priced?' },
  { key: 'deal_size_typical', section: 'company', type: 'short-text', label: 'Typical deal size (ACV or one-time)' },
  { key: 'sales_cycle_length', section: 'company', type: 'short-text', label: 'Typical sales cycle length' },
  { key: 'primary_buyer_role', section: 'company', type: 'short-text', required: true, label: "Primary buyer's role / title" },

  // icp
  { key: 'icp_description', section: 'icp', type: 'long-text', required: true, label: 'In your own words, who is your ideal customer?' },
  { key: 'icp_industries', section: 'icp', type: 'long-text', label: 'Industries / verticals you target' },
  { key: 'icp_company_size', section: 'icp', type: 'short-text', label: 'Company size range (employees or revenue)' },
  { key: 'icp_geo', section: 'icp', type: 'short-text', label: 'Geographies' },
  { key: 'icp_disqualifiers', section: 'icp', type: 'long-text', label: 'Who you explicitly do NOT want as a customer' },
  { key: 'icp_best_fit_example', section: 'icp', type: 'long-text', required: true, label: "Name one current customer who's a perfect fit — and why" },
  { key: 'icp_target_accounts_notes', section: 'icp', type: 'long-text', label: 'Top 10–20 target accounts (paste a list, or note that you uploaded one)' },
  { key: 'icp_target_accounts_upload', section: 'icp', type: 'upload', label: 'Upload target account list (optional)', uploadCategory: 'demandos-intake:target-accounts' },

  // gtm
  { key: 'gtm_primary_motion', section: 'gtm', type: 'single-select', required: true, label: 'Primary go-to-market motion', options: ['Outbound', 'Inbound', 'PLG', 'Events', 'Partner/Channel', 'Mixed'] },
  { key: 'gtm_active_channels', section: 'gtm', type: 'multi-select', label: 'Active channels today', options: ['Cold email', 'LinkedIn outbound', 'Paid search', 'Paid social', 'SEO/content', 'Webinars', 'Events', 'Partnerships', 'Referrals', 'Other'] },
  { key: 'gtm_internal_owner', section: 'gtm', type: 'short-text', required: true, label: 'Who owns demand gen internally (name, role)' },
  { key: 'gtm_other_vendors', section: 'gtm', type: 'long-text', label: 'Other agencies / vendors working in this space with you, and what they do' },

  // pipeline
  { key: 'pipeline_monthly_lead_volume', section: 'pipeline', type: 'short-text', label: 'Approx. monthly lead / MQL volume' },
  { key: 'pipeline_win_rate', section: 'pipeline', type: 'short-text', label: 'Approx. win rate (%)' },
  { key: 'pipeline_biggest_pain', section: 'pipeline', type: 'long-text', required: true, label: 'Biggest pipeline pain in one sentence' },
  { key: 'pipeline_crm_export', section: 'pipeline', type: 'upload', label: 'Upload CRM export or pipeline report (last 90 days)', uploadCategory: 'demandos-intake:pipeline-crm-export' },
  { key: 'pipeline_dashboard_screenshots', section: 'pipeline', type: 'upload', label: 'Upload dashboard screenshots or metrics docs', uploadCategory: 'demandos-intake:pipeline-dashboards' },

  // content
  { key: 'content_positioning', section: 'content', type: 'long-text', required: true, label: 'Current positioning / tagline in your own words' },
  { key: 'content_sales_deck', section: 'content', type: 'upload', label: 'Upload main sales deck', uploadCategory: 'demandos-intake:sales-deck' },
  { key: 'content_case_studies', section: 'content', type: 'upload', label: 'Upload case studies / one-pagers', uploadCategory: 'demandos-intake:case-study' },
  { key: 'content_brand_guidelines', section: 'content', type: 'upload', label: 'Upload brand guidelines (if any)', uploadCategory: 'demandos-intake:brand-guidelines' },
  { key: 'content_key_urls', section: 'content', type: 'long-text', label: 'Key page URLs (homepage, pricing, top blog post)' },

  // stack
  { key: 'stack_crm', section: 'stack', type: 'single-select', label: 'CRM', options: ['HubSpot', 'Salesforce', 'Pipedrive', 'Close', 'Attio', 'Other', 'None'] },
  { key: 'stack_marketing_automation', section: 'stack', type: 'single-select', label: 'Marketing automation', options: ['HubSpot', 'Marketo', 'Customer.io', 'ActiveCampaign', 'None', 'Other'] },
  { key: 'stack_analytics', section: 'stack', type: 'single-select', label: 'Analytics', options: ['GA4', 'Mixpanel', 'Amplitude', 'PostHog', 'None', 'Other'] },
  { key: 'stack_active_ad_accounts', section: 'stack', type: 'multi-select', label: 'Active ad accounts', options: ['Google', 'LinkedIn', 'Meta', 'X', 'TikTok', 'None'] },
  { key: 'stack_other_tools', section: 'stack', type: 'long-text', label: 'Other tools worth knowing' },

  // team
  { key: 'team_org_chart_upload', section: 'team', type: 'upload', label: 'Upload org chart (PDF, image, or link)', uploadCategory: 'demandos-intake:org-chart' },
  { key: 'team_primary_contact', section: 'team', type: 'long-text', required: true, label: 'Primary point of contact: name, role, email' },
  { key: 'team_decision_maker', section: 'team', type: 'long-text', label: 'Decision maker if different from primary contact' },
  { key: 'team_approvers', section: 'team', type: 'long-text', label: 'Who approves copy? Who approves budget?' },

  // goals
  { key: 'goals_90_day', section: 'goals', type: 'long-text', required: true, label: '90-day goal in one sentence' },
  { key: 'goals_annual', section: 'goals', type: 'long-text', required: true, label: 'Annual goal (revenue, pipeline, or logo target)' },
  { key: 'goals_winning_picture', section: 'goals', type: 'long-text', label: "What 'winning in 6 months' looks like" },
  { key: 'goals_biggest_concern', section: 'goals', type: 'long-text', required: true, label: 'Biggest concern / what would make this a failure' },
  { key: 'goals_seasonality', section: 'goals', type: 'long-text', label: 'Upcoming launches, seasonality, blackout periods' },

  // history
  { key: 'history_what_worked', section: 'history', type: 'long-text', label: "What's worked best in demand gen for you so far" },
  { key: 'history_what_failed', section: 'history', type: 'long-text', label: "What you've tried that didn't work, and why if you know" },
  { key: 'history_internal_obstacles', section: 'history', type: 'long-text', label: 'Internal obstacles I should know about (e.g., sales skeptical of marketing, brand is precious, legal is slow)' },
];

// Runtime self-validation — throws on import if config is malformed.
function validateQuestions(): void {
  const sectionSlugs = new Set(SECTIONS.map((s) => s.slug));
  const keys = new Set<string>();
  for (const q of QUESTIONS) {
    if (keys.has(q.key)) throw new Error(`Duplicate question key: ${q.key}`);
    keys.add(q.key);
    if (!sectionSlugs.has(q.section)) {
      throw new Error(`Question ${q.key} references unknown section ${q.section}`);
    }
    if ((q.type === 'single-select' || q.type === 'multi-select') && (!q.options || q.options.length === 0)) {
      throw new Error(`Question ${q.key} is ${q.type} but has no options`);
    }
    if (q.type === 'upload' && !q.uploadCategory) {
      throw new Error(`Question ${q.key} is upload but has no uploadCategory`);
    }
  }
}
validateQuestions();

export function questionsBySection(slug: string): ReadonlyArray<Question> {
  return QUESTIONS.filter((q) => q.section === slug);
}

export function requiredKeys(): string[] {
  return QUESTIONS.filter((q) => q.required).map((q) => q.key);
}
