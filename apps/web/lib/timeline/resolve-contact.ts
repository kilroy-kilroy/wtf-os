// apps/web/lib/timeline/resolve-contact.ts
import type { SupabaseClient } from '@repo/db';
import { normalizeEmail, deriveDomain, isFreeMailDomain } from './identity';

type Contact = { id: string; company_id: string | null };

async function resolveCompany(
  supabase: any,
  domain: string,
  opts: { companyName?: string; url?: string },
): Promise<string | null> {
  // Match an existing company by its url containing the domain.
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .ilike('url', `%${domain}%`)
    .limit(1)
    .maybeSingle();
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
    .ilike('email', normalized)
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
