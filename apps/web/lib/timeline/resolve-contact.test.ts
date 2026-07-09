// apps/web/lib/timeline/resolve-contact.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveContact } from './resolve-contact';

// Minimal chainable Supabase stub. Each table gets a scripted single-row result.
function stubClient(script: {
  contactByEmail?: any;
  insertedContact?: any;
  companyByDomain?: any;
  insertedCompany?: any;
}) {
  const calls: any[] = [];
  const client: any = {
    from(table: string) {
      const ctx: any = { table, _eq: {} };
      const api: any = {
        select: () => api,
        eq: (col: string, val: any) => { ctx._eq[col] = val; return api; },
        ilike: (col: string, val: any) => { ctx._eq[col] = val; return api; },
        limit: () => api,
        maybeSingle: async () => {
          calls.push({ op: 'select', ...ctx });
          if (table === 'contacts') return { data: script.contactByEmail ?? null, error: null };
          if (table === 'companies') return { data: script.companyByDomain ?? null, error: null };
          return { data: null, error: null };
        },
        insert: (row: any) => {
          calls.push({ op: 'insert', table, row });
          return {
            select: () => ({
              single: async () => ({
                data: table === 'contacts' ? script.insertedContact : script.insertedCompany,
                error: null,
              }),
            }),
          };
        },
      };
      return api;
    },
    _calls: calls,
  };
  return client;
}

describe('resolveContact', () => {
  it('returns null for an unusable email', async () => {
    const client = stubClient({});
    expect(await resolveContact(client, 'garbage')).toBeNull();
  });

  it('returns the existing contact without inserting', async () => {
    const client = stubClient({ contactByEmail: { id: 'c1', company_id: 'co1' } });
    const result = await resolveContact(client, 'Tim@Acme.co');
    expect(result).toEqual({ id: 'c1', company_id: 'co1' });
    expect(client._calls.some((c: any) => c.op === 'insert')).toBe(false);
  });

  it('creates company + contact for a new business email', async () => {
    const client = stubClient({
      contactByEmail: null,
      companyByDomain: null,
      insertedCompany: { id: 'coNew' },
      insertedContact: { id: 'cNew', company_id: 'coNew' },
    });
    const result = await resolveContact(client, 'jane@newco.com', { name: 'Jane' });
    expect(result).toEqual({ id: 'cNew', company_id: 'coNew' });
    const inserts = client._calls.filter((c: any) => c.op === 'insert');
    expect(inserts.map((i: any) => i.table)).toEqual(['companies', 'contacts']);
  });

  it('does NOT create a company for a free-mail address', async () => {
    const client = stubClient({
      contactByEmail: null,
      insertedContact: { id: 'cNew', company_id: null },
    });
    const result = await resolveContact(client, 'someone@gmail.com', { name: 'Someone' });
    expect(result).toEqual({ id: 'cNew', company_id: null });
    const inserts = client._calls.filter((c: any) => c.op === 'insert');
    expect(inserts.map((i: any) => i.table)).toEqual(['contacts']);
  });
});
