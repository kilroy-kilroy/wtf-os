// scripts/seed-contract-template.ts
//
// Seeds one MSA contract template + a couple of SOW snippets so the contract
// generator has something to render. Run once after the contracts migration is
// applied:
//
//   npx tsx scripts/seed-contract-template.ts
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env
// (e.g. loaded from .env.local).

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Body uses {{placeholders}} for merge fields, {{sow}} for the Statement of Work
// slot, and {{sig_*}} / {{date_*}} text anchors that Firma binds signature and
// date fields to after the PDF is uploaded.
const BODY_HTML = `
  <h1>Master Services Agreement</h1>
  <p>This Agreement is between WTF and {{company_name}}, located at {{address}},
     effective {{effective_date}}.</p>
  <h2>Statement of Work</h2>
  {{sow}}
  <h2>Fees</h2>
  <p>Total fee: {{fee}}.</p>
  <div class="sig-block">
    <p>Client: {{sig_client}} &nbsp; Date: {{date_client}}</p>
    <p>WTF: {{sig_counter}} &nbsp; Date: {{date_counter}}</p>
  </div>
`;

async function main() {
  const { error: tErr } = await db.from('contract_templates').insert({
    name: 'Master Services Agreement',
    slug: 'msa',
    body_html: BODY_HTML,
    variables: [
      { key: 'company_name', label: 'Company name', required: true },
      { key: 'address', label: 'Address', required: true },
      { key: 'effective_date', label: 'Effective date', required: true },
      { key: 'fee', label: 'Total fee', required: true },
    ],
    signer_config: { roles: ['client', 'counter'] },
  });
  if (tErr) throw new Error(`template insert failed: ${tErr.message}`);

  const { error: sErr } = await db.from('sow_snippets').insert([
    { label: 'Weekly check-ins', category: 'clause', body_html: '<p>Weekly 30-minute check-in calls.</p>' },
    { label: 'Net-30 payment', category: 'clause', body_html: '<p>Invoices are due Net-30.</p>' },
  ]);
  if (sErr) throw new Error(`snippet insert failed: ${sErr.message}`);

  console.log('Seeded MSA template + 2 snippets.');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
