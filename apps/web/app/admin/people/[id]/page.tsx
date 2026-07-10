// apps/web/app/admin/people/[id]/page.tsx
//
// Person View: one page showing everything WTF-OS knows about a contact —
// header (name/company/role), the cached AI "where we are / next step" card,
// and the unified timeline (email/call/assessment/discovery) newest first.
// Read side of the unified person timeline feature: all writes happen via
// resolveContact + emitTimelineEvent (see apps/web/lib/timeline); this page
// is a single query fan-out with no side effects.
import { createServerClient } from '@repo/db/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const ICON: Record<string, string> = {
  email: '📧', call: '📞', assessment: '📋', discovery: '🔎',
};

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createServerClient() as any;

  const { data: contact } = await db
    .from('contacts')
    .select('id, name, email, role, buyer_type, company_id')
    .eq('id', id)
    .maybeSingle();
  if (!contact) notFound();

  const { data: company } = contact.company_id
    ? await db.from('companies').select('name, url').eq('id', contact.company_id).maybeSingle()
    : { data: null };

  const { data: summary } = await db
    .from('contact_summaries')
    .select('summary, next_step, generated_at')
    .eq('contact_id', id)
    .maybeSingle();

  const { data: events } = await db
    .from('timeline_events')
    .select('id, source_type, title, summary, occurred_at')
    .eq('contact_id', id)
    .order('occurred_at', { ascending: false });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{contact.name}</h1>
        <p className="text-muted-foreground">
          {company?.name
            ? (
              <Link href={`/admin/company/${contact.company_id}`} className="hover:underline">
                {company.name}
              </Link>
            )
            : ''}
          {contact.role ? ` · ${contact.role}` : ''}
          {contact.buyer_type ? ` · ${contact.buyer_type}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">{contact.email}</p>
      </header>

      <section className="rounded-lg border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Where we are / Next step</h2>
          <form action={`/api/person/${id}/refresh-summary`} method="post">
            <button className="text-sm underline" type="submit">Refresh</button>
          </form>
        </div>
        {summary ? (
          <>
            <p className="mt-2 whitespace-pre-wrap">{summary.summary}</p>
            <p className="mt-2 font-medium">Next: {summary.next_step}</p>
          </>
        ) : (
          <p className="mt-2 text-muted-foreground">No summary yet — click Refresh.</p>
        )}
      </section>

      <section className="space-y-3">
        {(events ?? []).map((e: any) => (
          <div key={e.id} className="flex gap-3 border-b pb-3">
            <div className="text-xl">{ICON[e.source_type] ?? '•'}</div>
            <div>
              <div className="font-medium">{e.title}</div>
              {e.summary && <div className="text-sm text-muted-foreground">{e.summary}</div>}
              <div className="text-xs text-muted-foreground">
                {new Date(e.occurred_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {(events ?? []).length === 0 && (
          <p className="text-muted-foreground">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
