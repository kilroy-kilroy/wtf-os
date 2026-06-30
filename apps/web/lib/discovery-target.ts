/**
 * Resolve the real research target (company + website) for a Copper-driven
 * Discovery Lab brief.
 *
 * Why this exists: leads created by `copperSyncLead` (every lead-magnet flow —
 * Wah-Wah Detector, Biz Dev Assessment, etc.) produce a Copper opportunity
 * named `"{productName} — {email}"` and are NOT linked to a Copper Company
 * entity. The old logic (`company?.name || opportunity.name`) therefore fell
 * back to the opportunity name and handed the LLM the *lead magnet name*
 * ("Wah-Wah Detector") as the prospect company — see the Distill Health brief.
 *
 * The actual company signal lives on the contact: `company_name` (the submitted
 * site's hostname for Wah-Wah, the real company name for Biz Dev) and the
 * corporate email domain. This resolver uses those, in priority order, and only
 * uses the opportunity name as a last resort for manually-created opportunities.
 *
 * Pure function — no Copper types imported so it stays unit-testable. Callers
 * (`runDiscoveryAgent`, the Copper webhook) pass the structurally-compatible
 * Copper objects.
 */

export interface DiscoveryTargetInput {
  company: {
    name?: string | null;
    websites?: Array<{ url: string } | null> | null;
    email_domain?: string | null;
  } | null;
  contact: {
    company_name?: string | null;
    emails?: Array<{ email: string } | null> | null;
  } | null;
  opportunity: { name: string };
}

export interface DiscoveryTarget {
  companyName: string;
  companyWebsite: string | null;
}

// Personal/free mailbox providers — an email domain here does NOT identify the
// prospect's company, so we don't research it.
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
]);

function looksLikeDomain(value: string): boolean {
  // No spaces, at least one dot, a 2+ char TLD. Allows leading scheme/path,
  // which normalizeDomain strips.
  const stripped = value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  return /^[^\s@]+\.[^\s@]{2,}$/.test(stripped);
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0];
}

function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = normalizeDomain(email.slice(at + 1));
  return domain || null;
}

function websiteFromDomain(domain: string): string {
  return `https://${domain}`;
}

function firstEmail(contact: DiscoveryTargetInput["contact"]): string {
  return contact?.emails?.find((e) => e?.email)?.email?.trim() || "";
}

export function resolveDiscoveryTarget(input: DiscoveryTargetInput): DiscoveryTarget {
  const { company, contact, opportunity } = input;

  // 1. Linked Copper company entity — the most authoritative signal.
  const linkedName = company?.name?.trim();
  if (linkedName) {
    const linkedSite =
      company?.websites?.find((w) => w?.url)?.url ||
      (company?.email_domain ? websiteFromDomain(normalizeDomain(company.email_domain)) : null);
    return { companyName: linkedName, companyWebsite: linkedSite || null };
  }

  const email = firstEmail(contact);
  const emailDomain = email ? domainFromEmail(email) : null;
  const corporateEmailDomain = emailDomain && !FREE_EMAIL_DOMAINS.has(emailDomain) ? emailDomain : null;

  // 2. Explicit company string on the contact (hostname for Wah-Wah, real
  //    company name for Biz Dev). This is what `copperSyncLead` captures.
  const companyNameStr = contact?.company_name?.trim();
  if (companyNameStr) {
    if (looksLikeDomain(companyNameStr)) {
      const domain = normalizeDomain(companyNameStr);
      return { companyName: domain, companyWebsite: websiteFromDomain(domain) };
    }
    // A human-readable company name — backfill the website from the corporate
    // email domain when we have one.
    return {
      companyName: companyNameStr,
      companyWebsite: corporateEmailDomain ? websiteFromDomain(corporateEmailDomain) : null,
    };
  }

  // 3. Corporate email domain.
  if (corporateEmailDomain) {
    return { companyName: corporateEmailDomain, companyWebsite: websiteFromDomain(corporateEmailDomain) };
  }

  // 4. Last resort — manually-created opportunities with a real, human-typed
  //    name. Strip any "— email" decoration that the lead-magnet naming adds.
  const fallback = opportunity.name.split(" — ")[0]?.trim() || opportunity.name.trim() || "Unknown";
  return { companyName: fallback, companyWebsite: null };
}
