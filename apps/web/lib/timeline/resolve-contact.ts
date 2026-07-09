// apps/web/lib/timeline/resolve-contact.ts
import type { SupabaseClient } from '@repo/db';
import { normalizeEmail, deriveDomain, isFreeMailDomain } from './identity';

type Contact = { id: string; company_id: string | null };

function urlMatchesDomain(url: string | null | undefined, domain: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, '');
    const d = domain.toLowerCase();
    return host === d || host.endsWith(`.${d}`);
  } catch {
    return false;
  }
}

async function resolveCompany(
  supabase: any,
  domain: string,
  opts: { companyName?: string; url?: string },
): Promise<string | null> {
  // Fetch candidate companies whose url contains the domain, then narrow to
  // an exact hostname match in JS (ILIKE substring alone can false-positive,
  // e.g. domain `acme.com` matching url `https://acme.company.com`).
  const { data: candidates } = await supabase
    .from('companies')
    .select('id, url')
    .ilike('url', `%${domain}%`)
    .limit(5);
  const existing = (candidates ?? []).find((c: any) => urlMatchesDomain(c.url, domain));
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('companies')
    .insert({ name: opts.companyName || domain, url: opts.url || `https://${domain}` })
    .select('id')
    .single();
  if (error || !created) return null;
  return created.id;
}

export async function resolveContact(
  supabase: SupabaseClient,
  email: string | null | undefined,
  opts: { name?: string; companyName?: string; url?: string } = {},
): Promise<Contact | null> {
  const db = supabase as any;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data: existing } = await db
    .from('contacts')
    .select('id, company_id')
    .eq('email', normalized)
    .limit(1)
    .maybeSingle();
  if (existing) return { id: existing.id, company_id: existing.company_id ?? null };

  const domain = deriveDomain(normalized);
  let companyId: string | null = null;
  if (domain && !isFreeMailDomain(domain)) {
    companyId = await resolveCompany(db, domain, opts);
  }

  const { data: created, error } = await db
    .from('contacts')
    .insert({
      email: normalized,
      name: opts.name || normalized,
      company_id: companyId,
    })
    .select('id, company_id')
    .single();
  if (error || !created) return null;
  return { id: created.id, company_id: created.company_id ?? null };
}
