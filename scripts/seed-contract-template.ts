// scripts/seed-contract-template.ts
//
// Seeds the real KLRY contract templates + reusable SOW snippets so the contract
// generator has something to render. Idempotent: templates upsert on `slug`,
// snippets insert only when their label is missing — safe to re-run.
//
//   npx tsx scripts/seed-contract-template.ts
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env
// (e.g. loaded from .env.local).
//
// Body conventions: {{placeholders}} are merge fields; {{sow}} is the Statement
// of Work slot (AI-drafted on the fly); {{sig_*}} / {{date_*}} are Firma text
// anchors that bind signature/date fields after the PDF is uploaded.

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SIG_BLOCK = `
  <div class="sig-block">
    <p><strong>For KLRY, LLC</strong><br/>Tim Kilroy, CEO<br/>Signature: {{sig_counter}} &nbsp;&nbsp; Date: {{date_counter}}</p>
    <p><strong>For {{client_company_name}}</strong><br/>Name / Title: ____________________<br/>Signature: {{sig_client}} &nbsp;&nbsp; Date: {{date_client}}</p>
  </div>`;

// Per-page initials. Rendered as a position:fixed footer (print CSS in
// contract-pdf.ts), so the anchors repeat on every page and Firma places a
// per-page initials field for each party at every occurrence.
const INITIALS_FOOTER = `<div class="page-initials">Initials &mdash; Client: {{init_client}} &nbsp; KLRY: {{init_counter}}</div>`;

// 1) Master Services Agreement — the umbrella contract (no SOW slot).
const BODY_MSA = `
${INITIALS_FOOTER}
<h1>Master Services Agreement</h1>

<h2>Section 1: Introduction</h2>
<p>This Agreement, effective as of {{effective_date}} (the &ldquo;Effective Date&rdquo;), sets forth the terms and conditions under which KLRY, LLC, a Delaware corporation, with a place of business at 80 Pleasant Street, Arlington, MA 02476, will provide any services (collectively &ldquo;Services&rdquo;) to {{client_company_name}}, a corporation with a place of business located at {{client_address}} (the &ldquo;Client&rdquo;).</p>
<p>KLRY, LLC agrees to perform all Services in a good and workmanlike manner in conformity with the requirements of any Statement of Work (SOW) and applicable industry standards. Client agrees to facilitate KLRY, LLC&rsquo;s performance of the Services, provide all reasonable assistance and to pay all proper KLRY, LLC invoices as required. Client acknowledges and agrees that the Services may be an ongoing Service and shall continue for the duration indicated in a SOW or as earlier terminated to the extent permitted in this Agreement or a relevant SOW.</p>

<h2>Section 2: Performance Measures</h2>
<p>KLRY, LLC understands and agrees that Client will measure the success of the Services through the outcomes provided to Client, with the goal that the Services will increase sales pipeline opportunity and convert downstream into revenue and a strong ROI for Client. However, Client acknowledges and agrees that KLRY, LLC makes no warranty of any specific result or revenue resulting from Client&rsquo;s use of the Services and disclaims all warranties other than those expressly contained in this Agreement or Statement of Work.</p>

<h2>Section 3: Payment Terms</h2>
<p>Client agrees to pay all invoices for Services rendered and/or third party charges payable in accordance with the terms listed on any applicable SOW.</p>

<h2>Section 4: Confidentiality; Data Ownership and Technology Licenses</h2>
<p>Each party understands and acknowledges that by reason of its relationship with the other party and the nature of the Services, it will have access to certain confidential information of the other party, the value of which would be impaired if such information were disclosed to third parties. Confidential information of Client includes information and materials concerning Client&rsquo;s business, plans, customers, prospective customers, technology, and products. KLRY, LLC&rsquo;s confidential information includes information concerning its business methods, pricing, technology and service offerings. Each party agrees that it shall not disclose the confidential information of the other to third parties and that it shall protect the other party&rsquo;s confidential information with the same degree of care it uses to protect its own confidential information but not less than reasonable care. Confidential information does not include information that:</p>
<ol>
  <li>Is already known by the receiving party at the time it is obtained by it, free from any obligation to keep such information confidential;</li>
  <li>Is or becomes publicly known through no wrongful act of the receiving party;</li>
  <li>Is rightfully received by the receiving party from a third party without restriction and without breach of this Agreement; or</li>
  <li>Is independently developed by a party without using or referencing any confidential information of the other party. Should a party ever be notified of any judicial or other proceeding seeking to obtain access to confidential information of the other party, the party receiving such notice shall (a) promptly notify the other party to the extent permitted by law, (b) take such reasonable and permitted actions at the other party&rsquo;s expense as may be specified by the other party to resist providing such access and (c) if such access cannot be resisted, then only permit access to the extent required by law. Each party agrees to defend, indemnify and hold harmless the other party against any third-party claim alleging that the intellectual property provided by the indemnifying party in connection with the Agreement infringes any U.S. patent, trademark, service mark, copyright or trade secret. The indemnified party must notify the other party in writing promptly upon learning of any claim or suit for which indemnification may be sought, provided that the failure to do so shall have no effect except to the extent that the indemnifying party is prejudiced by the failure to receive prompt notice. The indemnifying party may not settle any such claim without the written consent of the indemnified party.</li>
</ol>

<h2>Section 5: Force Majeure and Limitation of Liability</h2>
<p>Except for payment obligations, neither party is responsible to fulfill its obligations to the extent due to causes beyond its control; provided such party uses reasonable means to accommodate such external causes and resumes performance as soon as possible once the cause has ceased or is otherwise resolved. In no event will either party have any liability to the other party for any lost profits, lost data or for any indirect, special, incidental, exemplary, punitive, or consequential damages of any kind or nature however caused and, whether in contract, tort or under any other theory of liability, whether or not the other party has been advised of the possibility of such damages. In no event will KLRY, LLC&rsquo;s aggregate liability arising out of or related to this agreement, whether in contract, tort or under any other theory of liability exceed the amount actually paid by and/or due from Client with regard to the specific SOW giving rise to the claim of liability.</p>

<h2>Section 6: Term</h2>
<p>The term of this Agreement shall take effect on the Effective Date set forth above and, subject to the following, shall continue in effect until the termination or expiration of all Schedules issued pursuant to this Agreement.</p>
<p>Either party may terminate this Agreement and any Schedules issued pursuant to this Agreement for any reason upon thirty (30) business days written notice to the other party.</p>
<p>Without limiting the rights set forth above, in the event of a material breach of this Agreement by either party that is not cured within thirty (30) days after receipt of written notice describing such breach, the non-breaching party may terminate this Agreement immediately by providing written notice to the breaching party of such termination.</p>
<p>In the event of any termination of this Agreement, any Schedule or an order placed here or thereunder, Client is responsible for paying KLRY, LLC for authorized and pre-approved accrued and unpaid fees due under this Agreement in respect of work properly performed in accordance with this Agreement prior to the date of termination, on a pro rata basis where those fees are time based.</p>

<h2>Section 7: Miscellaneous</h2>
<ol>
  <li><strong>Announcements:</strong> KLRY, LLC is granted a revocable license to use Client&rsquo;s logo and name.</li>
  <li><strong>Independent Contractor:</strong> KLRY, LLC is an independent contractor and that, except as expressly permitted in any Schedule to this Agreement, this Agreement does not create an agency, employer, partner or joint venture relationship of any kind. Likewise, as an independent contractor, KLRY, LLC shall be solely responsible for all taxes, insurance, and benefits (except as otherwise agreed in writing by Client).</li>
  <li><strong>Assignment:</strong> This Agreement shall be binding on the parties, and on their successors and assigns, without regard to whether or not this Agreement is expressly acknowledged in any instrument of succession or assignment.</li>
  <li><strong>Amendment:</strong> This Agreement may be amended or modified only by a signed written instrument executed by both parties to this Agreement clearly setting forth the amendments and/or modifications of this Agreement to be effectuated thereby.</li>
  <li><strong>Notice:</strong> All notices, requests and other communications hereunder shall be in writing and shall be deemed delivered at the time of receipt if delivered by hand or communicated by electronic transmission, or, if mailed, three (3) days after mailing by first class mail with postage prepaid. Notices to KLRY, LLC and Client shall be addressed to the addresses provided herein, or to such other address, as either party shall designate in writing to the other from time to time.</li>
  <li><strong>Waiver and Severability:</strong> Either party&rsquo;s waiver of or failure to exercise any right provided for in this Agreement shall not be deemed a waiver of any further or future right under this Agreement. If any term or provision of this Agreement or any application of this Agreement shall be declared or held invalid, illegal, or unenforceable, in whole or in part, whether generally or in any particular jurisdiction, such provision shall be deemed amended to the extent, but only to the extent, necessary to cure such invalidity, illegality, or unenforceability, and the validity, legality, and enforceability of the remaining provisions, both generally and in every other jurisdiction, shall not in any way be affected or impaired thereby.</li>
  <li><strong>Governing Law:</strong> This Agreement shall be governed by and interpreted in accordance with the applicable provisions of the laws of the Commonwealth of Massachusetts. Each of the parties hereto consents and agrees to the non-exclusive jurisdiction of any state or federal court sitting in the Commonwealth of Massachusetts, with respect to any action instituted under or in relation to this Agreement.</li>
</ol>
${SIG_BLOCK}`;

// 2) Statement of Work — generic. Scope/term/fees flow into the {{sow}} slot.
const BODY_SOW = `
${INITIALS_FOOTER}
<h1>Statement of Work</h1>
<p>This is a schedule, effective {{effective_date}} to the Master Services Agreement between KLRY, LLC and {{client_company_name}} (Client, and collectively The Parties) dated {{msa_date}}. All terms and conditions set forth in the Agreement apply to this Schedule, except where expressly noted to the contrary.</p>

{{sow}}

<h3>Fees &amp; Payment</h3>
<p>{{fee}}</p>
${SIG_BLOCK}`;

// 3) Agency Studio Plus SOW — productized offer with fixed scope + $999/mo.
const BODY_AGENCY = `
${INITIALS_FOOTER}
<h1>Statement of Work &mdash; Agency Studio Plus</h1>
<p>This is a schedule, effective {{effective_date}} to the Master Services Agreement between KLRY, LLC and {{client_company_name}} (Client, and collectively The Parties) dated {{msa_date}}. All terms and conditions set forth in the Agreement apply to this Schedule, except where expressly noted to the contrary.</p>
<p>KLRY, LLC will deliver coaching and strategic advisory services across six areas of the Client&rsquo;s business: sales, demand generation, positioning, pricing, delivery, and team.</p>

<h3>2. Engagement Structure</h3>
<p>The engagement runs in six-month cycles.</p>
<p><em>Month 1.</em> Provider conducts one two-hour deep-dive working session covering revenue, offer, team, pipeline, profitability, and leadership. Provider then produces a written six-month go-forward plan with a status rating for each area of the business and a prioritized sequence of work, followed by one dedicated strategy review session to walk through the plan.</p>
<p><em>Months 2 through 5.</em> Provider delivers ongoing execution support against the plan, addressing priorities and time-sensitive issues as they arise.</p>
<p><em>Month 6.</em> Provider conducts a new two-hour deep-dive session and produces a new written six-month plan. The cycle then repeats.</p>

<h3>3. Recurring Deliverables (Every Month)</h3>
<ul>
  <li>One monthly 1:1 coaching session: 75 minutes, or two 40-minute sessions, at Client&rsquo;s option.</li>
  <li>Office hours plus asynchronous access via Slack, email, or a mutually agreed channel.</li>
  <li>A weekly written check-in (&ldquo;5 Minute Friday&rdquo;).</li>
</ul>

<h3>Fees &amp; Term</h3>
<p><strong>Term:</strong> This agreement is month-to-month and renews monthly at the date of execution.</p>
<p><strong>Fees &amp; Payment Schedule:</strong> The fee for this service is $999/mo, paid in advance. In the event of cancellation, there are no prorated refunds.</p>
${SIG_BLOCK}`;

const SOW_VARS = [
  { key: 'client_company_name', label: 'Client company name', required: true },
  { key: 'effective_date', label: 'SOW effective date', required: true },
  { key: 'msa_date', label: 'MSA date (date the MSA was dated)', required: true },
];

// Generic SOW also captures the fee as a required, structured field so it is
// never left to the AI-drafted scope (and so a send fails if it's missing).
const SOW_VARS_WITH_FEE = [
  ...SOW_VARS,
  { key: 'fee', label: 'Total fee (e.g. $5,000/mo or $20,000 fixed)', required: true },
];

const TEMPLATES = [
  {
    name: 'Master Services Agreement',
    slug: 'msa',
    body_html: BODY_MSA,
    variables: [
      { key: 'client_company_name', label: 'Client company name', required: true },
      { key: 'client_address', label: 'Client address', required: true },
      { key: 'effective_date', label: 'Effective date', required: true },
    ],
    signer_config: { roles: ['client', 'counter'] },
  },
  {
    name: 'Statement of Work',
    slug: 'sow',
    body_html: BODY_SOW,
    variables: SOW_VARS_WITH_FEE,
    signer_config: { roles: ['client', 'counter'] },
  },
  {
    name: 'Agency Studio Plus SOW',
    slug: 'sow-agency-studio-plus',
    body_html: BODY_AGENCY,
    variables: SOW_VARS,
    signer_config: { roles: ['client', 'counter'] },
  },
];

const SNIPPETS = [
  { label: 'Monthly 1:1 coaching', category: 'deliverable', body_html: '<li>One monthly 1:1 coaching session: 75 minutes, or two 40-minute sessions, at Client&rsquo;s option.</li>' },
  { label: 'Office hours + async access', category: 'deliverable', body_html: '<li>Office hours plus asynchronous access via Slack, email, or a mutually agreed channel.</li>' },
  { label: '5 Minute Friday check-in', category: 'deliverable', body_html: '<li>A weekly written check-in (&ldquo;5 Minute Friday&rdquo;).</li>' },
  { label: 'No prorated refunds', category: 'clause', body_html: '<p>In the event of cancellation, there are no prorated refunds.</p>' },
];

async function main() {
  // Templates: upsert on slug so re-running replaces prior bodies cleanly.
  const { error: tErr } = await db
    .from('contract_templates')
    .upsert(
      TEMPLATES.map((t) => ({ ...t, is_active: true })),
      { onConflict: 'slug' },
    );
  if (tErr) throw new Error(`template upsert failed: ${tErr.message}`);

  // Snippets have no unique key — insert only the labels that don't exist yet.
  const { data: existing } = await db.from('sow_snippets').select('label');
  const have = new Set((existing ?? []).map((r) => r.label));
  const toAdd = SNIPPETS.filter((s) => !have.has(s.label));
  if (toAdd.length) {
    const { error: sErr } = await db.from('sow_snippets').insert(toAdd);
    if (sErr) throw new Error(`snippet insert failed: ${sErr.message}`);
  }

  console.log(`Seeded ${TEMPLATES.length} templates + ${toAdd.length} new snippets.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
