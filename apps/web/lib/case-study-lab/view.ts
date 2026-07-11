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
    ? r.approach.filter((a: any) => a && typeof a === "object").slice(0, 3).map((a: any) => ({ challenge: String(a.challenge ?? ""), method: String(a.method ?? "") }))
    : Array.isArray(r.issues)
      ? r.issues.filter((i: any) => i && typeof i === "object").slice(0, 3).map((i: any) => ({ challenge: String(i.issue ?? ""), method: String(i.solution ?? "") }))
      : [];

  const stats = Array.isArray(r.results)
    ? r.results.filter((st: any) => st && typeof st === "object").slice(0, 3).map((st: any) =>
        "caption" in st
          ? { value: String(st.value ?? ""), caption: String(st.caption ?? ""), direction: (st.direction ?? "up") as "up" | "down" | "flat" }
          : { value: String(st.value ?? ""), caption: String(st.label ?? ""), direction: "up" as const }
      )
    : [];

  const q = r.quote;
  const quote =
    q && typeof q === "object" && typeof q.text === "string" && typeof q.attribution === "string"
      ? { text: q.text, attribution: q.attribution }
      : null;

  return {
    accent,
    agencyLogoUrl: report.agency_logo_url ?? null,
    agencyName: report.agency_name ?? null,
    clientLogoUrl: report.client_logo_url ?? null,
    clientName: String(r.clientName ?? ""),
    clientDescriptor: String(r.clientDescriptor ?? ""),
    kicker: typeof r.kicker === "string" ? r.kicker : null,
    dek: typeof r.dek === "string" ? r.dek : null,
    headline: String(r.headline ?? ""),
    approach,
    bridge: typeof r.bridge === "string" ? r.bridge : null,
    stats,
    quote,
    cta: String(r.cta ?? "Want results like this? Book a call."),
    ctaHref: safeUrl(report.cta_url) ?? safeUrl(report.agency_url),
    poweredByHref: POWERED_BY_HREF,
  };
}

// ── Case Study Lab Pro: Transformation Story view ───────────────────────────
// Same brand/accent/CTA envelope as CaseStudyView, but the body is an arc:
// a starting state, ordered phases, the outcome stats, and an end state.

export interface TransformationView {
  accent: string;
  agencyLogoUrl: string | null;
  agencyName: string | null;
  clientLogoUrl: string | null;
  clientName: string;
  clientDescriptor: string;
  kicker: string | null;
  dek: string | null;
  headline: string;
  startingState: string | null;
  phases: { label: string; detail: string; timeframe: string | null }[];
  stats: { value: string; caption: string; direction: "up" | "down" | "flat" }[];
  endState: string | null;
  quote: { text: string; attribution: string } | null;
  cta: string;
  ctaHref: string | null;
  // Pro is white-label by default (no "Powered by" mark); free is not.
  poweredByHref: string | null;
}

export function buildTransformationView(report: {
  agency_brand?: AgencyBrand | null;
  agency_url?: string | null;
  client_logo_url?: string | null;
  agency_logo_url?: string | null;
  agency_name?: string | null;
  accent?: string | null;
  cta_url?: string | null;
  white_label?: boolean | null;
  result: any; // stored JSON — typed loosely on purpose
}): TransformationView {
  const colors = report.agency_brand?.colors ?? [];
  const scraped = colors.find((c) => HEX.test(c)) ?? colors[0];
  const accent =
    (report.accent && HEX.test(report.accent) ? report.accent : undefined) ?? scraped ?? DEFAULT_ACCENT;

  const r = report.result ?? {};

  const phases = Array.isArray(r.phases)
    ? r.phases
        .filter((p: any) => p && typeof p === "object")
        .slice(0, 5)
        .map((p: any) => ({
          label: String(p.label ?? ""),
          detail: String(p.detail ?? ""),
          timeframe: typeof p.timeframe === "string" && p.timeframe.trim() ? p.timeframe : null,
        }))
    : [];

  const stats = Array.isArray(r.results)
    ? r.results
        .filter((st: any) => st && typeof st === "object")
        .slice(0, 3)
        .map((st: any) =>
          "caption" in st
            ? { value: String(st.value ?? ""), caption: String(st.caption ?? ""), direction: (st.direction ?? "up") as "up" | "down" | "flat" }
            : { value: String(st.value ?? ""), caption: String(st.label ?? ""), direction: "up" as const }
        )
    : [];

  const q = r.quote;
  const quote =
    q && typeof q === "object" && typeof q.text === "string" && typeof q.attribution === "string"
      ? { text: q.text, attribution: q.attribution }
      : null;

  return {
    accent,
    agencyLogoUrl: report.agency_logo_url ?? null,
    agencyName: report.agency_name ?? null,
    clientLogoUrl: report.client_logo_url ?? null,
    clientName: String(r.clientName ?? ""),
    clientDescriptor: String(r.clientDescriptor ?? ""),
    kicker: typeof r.kicker === "string" ? r.kicker : null,
    dek: typeof r.dek === "string" ? r.dek : null,
    headline: String(r.headline ?? ""),
    startingState: typeof r.startingState === "string" ? r.startingState : null,
    phases,
    stats,
    endState: typeof r.endState === "string" ? r.endState : null,
    quote,
    cta: String(r.cta ?? "Want a transformation like this? Book a call."),
    ctaHref: safeUrl(report.cta_url) ?? safeUrl(report.agency_url),
    poweredByHref: report.white_label ? null : POWERED_BY_HREF,
  };
}
