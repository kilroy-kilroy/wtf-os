// apps/web/app/admin/company/[id]/page.tsx
//
// Company View: the account-level rollup for the unified timeline. Shows the
// company header, the roster of contacts we know at that company (each linking
// to their Person View), and a MERGED timeline across everyone at the company —
// newest first, each event labeled with the person it belongs to.
//
// Membership is resolved via contacts.company_id (the authoritative link), then
// events are fetched by that set of contact IDs. We deliberately do NOT filter
// timeline_events by its own company_id column: that column is nullable and only
// populated if the contact was already linked to the company at emit-time, so
// filtering on it would silently drop earlier events. Read-only, no side effects.
import { createServerClient } from '@repo/db/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const ICON: Record<string, string> = {
  email: '📧', call: '📞', assessment: '📋', discovery: '🔎',
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createServerClient() as any;

  const { data: company } = await db
    .from('companies')
    .select('id, name, url, industry')
    .eq('id', id)
    .maybeSingle();
  if (!company) notFound();

  const { data: contacts } = await db
    .from('contacts')
    .select('id, name, email, role, buyer_type')
    .eq('company_id', id)
    .order('name', { ascending: true });

  const contactList: any[] = contacts ?? [];
  const nameById = new Map<string, string>(
    contactList.map((c: any) => [c.id, c.name]),
  );

  // Merged timeline: only query when there's at least one contact, so we never
  // send an empty .in() list (which some PostgREST versions reject).
  let events: any[] = [];
  if (contactList.length > 0) {
    const { data } = await db
      .from('timeline_events')
      .select('id, contact_id, source_type, title, summary, occurred_at')
      .in('contact_id', contactList.map((c: any) => c.id))
      .order('occurred_at', { ascending: false })
      .limit(100);
    events = data ?? [];
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <p className="text-muted-foreground">
          {company.url
            ? (
              <a href={company.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {company.url.replace(/^https?:\/\//, '')}
              </a>
            )
            : ''}
          {company.industry ? `${company.url ? ' · ' : ''}${company.industry}` : ''}
        </p>
      </header>

      <section>
        <h2 className="font-medium mb-2">People ({contactList.length})</h2>
        {contactList.length > 0 ? (
          <ul className="divide-y">
            {contactList.map((c: any) => (
              <li key={c.id} className="py-2">
                <Link href={`/admin/people/${c.id}`} className="hover:underline font-medium">
                  {c.name}
                </Link>
                <span className="text-muted-foreground text-sm">
                  {c.role ? ` · ${c.role}` : ''}
                  {c.buyer_type ? ` · ${c.buyer_type}` : ''}
                  {c.email ? ` · ${c.email}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No contacts linked to this company yet.</p>
        )}
      </section>

      <section>
        <h2 className="font-medium mb-3">Activity</h2>
        <div className="space-y-3">
          {events.map((e: any) => (
            <div key={e.id} className="flex gap-3 border-b pb-3">
              <div className="text-xl">{ICON[e.source_type] ?? '•'}</div>
              <div>
                <div className="font-medium">{e.title}</div>
                {e.summary && <div className="text-sm text-muted-foreground">{e.summary}</div>}
                <div className="text-xs text-muted-foreground">
                  {nameById.get(e.contact_id) ?? 'Unknown'}
                  {' · '}
                  {new Date(e.occurred_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-muted-foreground">No activity yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
