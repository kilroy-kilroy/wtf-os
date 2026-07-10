import type { CaseStudy, AgencyBrand } from "@repo/prompts";

export const CARD_SIZES = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1200, height: 675 },
} as const;

export type CardSize = keyof typeof CARD_SIZES;

const DEFAULT_ACCENT = "#E51B23";

export type CardModel = {
  accent: string;
  clientLogoUrl: string | null;
  agencyLogoUrl: string | null;
  agencyName: string | null;
  headline: string;
  clientName: string;
  clientDescriptor: string;
  topResults: { label: string; value: string }[];
  quote: { text: string; attribution: string } | null;
  cta: string;
};

export function buildCardModel(report: {
  agency_brand: AgencyBrand | null;
  client_logo_url: string | null;
  agency_logo_url?: string | null;
  agency_name?: string | null;
  accent?: string | null;
  result: CaseStudy;
}): CardModel {
  const colors = report.agency_brand?.colors ?? [];
  const scraped = colors.find((c) => /^#[0-9a-f]{6}$/i.test(c)) ?? colors[0];
  const accent =
    (report.accent && /^#[0-9a-f]{6}$/i.test(report.accent) ? report.accent : undefined) ??
    scraped ??
    DEFAULT_ACCENT;
  return {
    accent,
    clientLogoUrl: report.client_logo_url,
    agencyLogoUrl: report.agency_logo_url ?? null,
    agencyName: report.agency_name ?? null,
    headline: report.result.headline,
    clientName: report.result.clientName,
    clientDescriptor: report.result.clientDescriptor,
    topResults: report.result.results.slice(0, 3),
    quote: report.result.quote,
    cta: report.result.cta,
  };
}
