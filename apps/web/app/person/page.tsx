// apps/web/app/person/page.tsx
//
// Entry point into the unified person timeline: search contacts by name/email,
// or (with no query) see the people with the most recent timeline activity —
// the natural "who do I need to look at" landing view.
import { createServerClient } from '@repo/db/client';
import Link from 'next/link';

export default async function PeopleIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim();
  const db = createServerClient() as any;

  let contacts: any[] = [];
  if (q) {
    // Two separate .ilike() queries instead of a single .or() with an
    // interpolated combinator string: .or() parses its argument as
    // PostgREST filter syntax, so raw user input (commas, parens) can
    // break the filter or inject extra predicates. .ilike(column, pattern)
    // sends the pattern as a parameter, not as syntax to parse.
    const pattern = `%${q}%`;
    const [byName, byEmail] = await Promise.all([
      db.from('contacts').select('id, name, email').ilike('name', pattern).limit(25),
      db.from('contacts').select('id, name, email').ilike('email', pattern).limit(25),
    ]);
    const seen = new Set<string>();
    contacts = [...(byName.data ?? []), ...(byEmail.data ?? [])]
      .filter((c: any) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .slice(0, 25);
  } else {
    // recently active: contacts with the newest timeline events
    const { data } = await db.from('timeline_events')
      .select('contact_id, occurred_at, contacts(id, name, email)')
      .order('occurred_at', { ascending: false })
      .limit(50);
    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (row.contacts && !seen.has(row.contact_id)) {
        seen.add(row.contact_id);
        contacts.push(row.contacts);
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">People</h1>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={q ?? ''} placeholder="Search name or email"
          className="border rounded px-3 py-2 flex-1" />
        <button className="border rounded px-3">Search</button>
      </form>
      <ul className="divide-y">
        {contacts.map((c) => (
          <li key={c.id} className="py-2">
            <Link href={`/person/${c.id}`} className="hover:underline">
              {c.name} <span className="text-muted-foreground text-sm">{c.email}</span>
            </Link>
          </li>
        ))}
      </ul>
      {contacts.length === 0 && (
        <p className="text-muted-foreground">
          {q ? 'No matches.' : 'No recent activity yet.'}
        </p>
      )}
    </div>
  );
}
