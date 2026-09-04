// Fixed option sets, stored as slugs. These are the dimensions the corpus is
// later sliced by ("X% of discovery calls that were won did Y"), so the values
// must stay stable — renaming a slug silently rewrites history.

export interface Option { value: string; label: string }

export const SERVICES: Option[] = [
  { value: 'paid_media', label: 'Paid media' },
  { value: 'seo', label: 'SEO' },
  { value: 'content', label: 'Content' },
  { value: 'web_dev', label: 'Web design / development' },
  { value: 'branding', label: 'Branding / creative' },
  { value: 'email', label: 'Email / lifecycle' },
  { value: 'social', label: 'Social' },
  { value: 'pr', label: 'PR' },
  { value: 'strategy', label: 'Strategy / consulting' },
  { value: 'full_service', label: 'Full service' },
  { value: 'other', label: 'Other' },
];

export const REVENUE_BANDS: Option[] = [
  { value: 'under_500k', label: 'Under $500K' },
  { value: '500k_1m', label: '$500K – $1M' },
  { value: '1m_3m', label: '$1M – $3M' },
  { value: '3m_5m', label: '$3M – $5M' },
  { value: '5m_10m', label: '$5M – $10M' },
  { value: '10m_plus', label: '$10M+' },
];

export const STAGES: Option[] = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'pitch', label: 'Pitch / presentation' },
  { value: 'proposal', label: 'Proposal review' },
  { value: 'negotiation', label: 'Negotiation / closing' },
  { value: 'renewal', label: 'Renewal / expansion' },
  { value: 'other', label: 'Other' },
];

export const OUTCOMES: Option[] = [
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'no_decision', label: 'No decision yet' },
  { value: 'ghosted', label: 'Ghosted' },
  { value: 'na', label: 'Not applicable' },
];

export const DEAL_SIZE_BANDS: Option[] = [
  { value: 'under_2_5k_mo', label: 'Under $2.5K/mo' },
  { value: '2_5k_5k_mo', label: '$2.5K – $5K/mo' },
  { value: '5k_10k_mo', label: '$5K – $10K/mo' },
  { value: '10k_25k_mo', label: '$10K – $25K/mo' },
  { value: '25k_plus_mo', label: '$25K+/mo' },
  { value: 'one_time_project', label: 'One-time project' },
  { value: 'unsure', label: 'Not sure' },
];

export function isValidOption(options: Option[], value: unknown): boolean {
  return typeof value === 'string' && options.some((o) => o.value === value);
}

export function labelFor(options: Option[], value: string | null | undefined): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}
