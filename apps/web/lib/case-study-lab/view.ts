import type { AgencyBrand } from "@repo/prompts";

const DEFAULT_ACCENT = "#E51B23";
const POWERED_BY_HREF = "https://app.timkilroy.com/case-study-lab";
const HEX = /^#[0-9a-f]{6}$/i;

export interface CaseStudyView {
  accent: string;
  agencyLogoUrl: string | null;
  agencyName: string | null;
  clientLogoUrl: string | null;
  clientName: string;
  clientDescriptor: string;
  kicker: string | null;
  dek: string | null;
  headline: string;
  approach: { challenge: string; method: string }[];
  bridge: string | null;
  stats: { value: string; caption: string; direction: "up" | "down" | "flat" }[];
  quote: { text: string; attribution: string } | null;
  cta: string;
  ctaHref: string | null;
  poweredByHref: string;
}

function safeUrl(u: unknown): string | null {
  if (typeof u !== "string" || !u.trim()) return null;
  try {
    const parsed = new URL(u.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function buildCaseStudyView(report: {
  agency_brand?: AgencyBrand | null;
  agency_url?: string | null;
  client_logo_url?: string | null;
  agency_logo_url?: string | null;
  agency_name?: string | null;
  accent?: string | null;
  cta_url?: string | null;
  result: any; // stored JSON — new or legacy shape; typed loosely on purpose
}): CaseStudyView {
  const colors = report.agency_brand?.colors ?? [];
  const scraped = colors.find((c) => HEX.test(c)) ?? colors[0];
  const accent =
    (report.accent && HEX.test(report.accent) ? report.accent : undefined) ?? scraped ?? DEFAULT_ACCENT;

  const r = report.result ?? {};

  const approach: { challenge: string; method: string }[] = Array.isArray(r.approach)
    ? r.approach.slice(0, 3).map((a: any) => ({ challenge: String(a.challenge ?? ""), method: String(a.method ?? "") }))
    : Array.isArray(r.issues)
      ? r.issues.slice(0, 3).map((i: any) => ({ challenge: String(i.issue ?? ""), method: String(i.solution ?? "") }))
      : [];

  const stats = Array.isArray(r.results)
    ? r.results.slice(0, 3).map((st: any) =>
        "caption" in st
          ? { value: String(st.value ?? ""), caption: String(st.caption ?? ""), direction: (st.direction ?? "up") as "up" | "down" | "flat" }
          : { value: String(st.value ?? ""), caption: String(st.label ?? ""), direction: "up" as const }
      )
    : [];

  return {
    accent,
    agencyLogoUrl: report.agency_logo_url ?? null,
    agencyName: report.agency_name ?? null,
    clientLogoUrl: report.client_logo_url ?? null,
    clientName: String(r.clientName ?? ""),
    clientDescriptor: String(r.clientDescriptor ?? ""),
    kicker: r.kicker ?? null,
    dek: typeof r.dek === "string" ? r.dek : null,
    headline: String(r.headline ?? ""),
    approach,
    bridge: typeof r.bridge === "string" ? r.bridge : null,
    stats,
    quote: r.quote ?? null,
    cta: String(r.cta ?? "Want results like this? Book a call."),
    ctaHref: safeUrl(report.cta_url) ?? safeUrl(report.agency_url),
    poweredByHref: POWERED_BY_HREF,
  };
}
