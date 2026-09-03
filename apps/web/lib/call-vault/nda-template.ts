// Call Vault NDA. Source of truth: docs/call-review-nda-massachusetts.md.
//
// KLRY's side is PRE-EXECUTED (typed signature) so the envelope has exactly one
// signer and the document is fully executed the instant the contributor signs —
// no countersignature, no waiting. Only {{sig_client}} / {{date_client}} are
// Firma anchors.
//
// No <table>: packages/pdf/contract-report.tsx handles h1-h4, p, ul, ol, div
// only, so a table silently renders as nothing.

export const CALL_VAULT_NDA_SLUG = 'call-vault-nda';
export const CALL_VAULT_NDA_NAME = 'Confidentiality and Data Use Agreement (Call Recordings and Transcripts)';

export const CALL_VAULT_NDA_VARIABLES = [
  { key: 'client_legal_name', label: 'Client legal entity name', required: true },
  { key: 'client_address',    label: 'Client business address',  required: true },
  { key: 'effective_date',    label: 'Effective date',           required: true },
];

export const CALL_VAULT_NDA_HTML = `
<h1>Confidentiality and Data Use Agreement</h1>
<h3>(Call Recordings and Transcripts)</h3>

<p>This Confidentiality and Data Use Agreement (this &ldquo;Agreement&rdquo;) is entered into as of <strong>{{effective_date}}</strong> (the &ldquo;Effective Date&rdquo;) by and between:</p>

<p><strong>{{client_legal_name}}</strong>, with an address at {{client_address}} (&ldquo;Client&rdquo;); and</p>

<p><strong>KLRY LLC</strong>, a Delaware Limited Liability Corporation, with an address at 139 Pleasant Street, Arlington, MA 02476 (&ldquo;Consultant&rdquo;).</p>

<h2>1. Purpose and Scope</h2>

<p>Client has engaged Consultant to review and provide feedback on Client&rsquo;s sales, discovery, and/or client calls (the &ldquo;Consultation&rdquo;). In connection with the Consultation, Client will provide Consultant with call recordings, call transcripts, and related notes or materials (collectively, the &ldquo;Call Materials&rdquo;).</p>

<p><strong>This Agreement applies only to the Call Materials and the information contained in them.</strong> It does not create confidentiality obligations with respect to any other information exchanged between the Parties.</p>

<h2>2. Confidential Information</h2>

<p>&ldquo;Confidential Information&rdquo; means the Call Materials and any non-public information contained in or derived from them, including without limitation: Client&rsquo;s identity and the identity of Client&rsquo;s agency; the names, identities, and contact information of Client&rsquo;s prospects, clients, employees, and call participants; Client&rsquo;s pricing, rates, proposals, margins, and financial information; Client&rsquo;s sales scripts, methodologies, and internal processes; and any other business, technical, or personal information disclosed within the Call Materials.</p>

<h2>3. Exclusions</h2>

<p>Confidential Information does not include information that Consultant can demonstrate:</p>

<p>(a) was publicly available at the time of disclosure, or later became publicly available through no fault or breach of Consultant;</p>

<p>(b) was rightfully known to Consultant, without restriction, before disclosure by Client;</p>

<p>(c) was rightfully received by Consultant from a third party who was not under an obligation of confidentiality; or</p>

<p>(d) was independently developed by Consultant without use of or reference to the Confidential Information.</p>

<p>For the avoidance of doubt, Anonymized Data (defined in Section 5) is not Confidential Information once anonymized in accordance with Section 5.</p>

<h2>4. Consultant&rsquo;s Obligations</h2>

<p>Consultant shall:</p>

<p>(a) use the Confidential Information solely to perform the Consultation and deliver feedback to Client;</p>

<p>(b) not disclose the Confidential Information to any third party without Client&rsquo;s prior written consent, except (i) to Consultant&rsquo;s employees, contractors, and service providers who have a need to know it for the Consultation and who are bound by confidentiality obligations at least as protective as those in this Agreement, and (ii) as required by law, regulation, subpoena, or court order, provided Consultant gives Client prompt written notice (to the extent legally permitted) and discloses only the portion legally required;</p>

<p>(c) store the Call Materials in access-controlled systems and protect them using at least a reasonable degree of care; and</p>

<p>(d) promptly notify Client in writing upon discovering any unauthorized access to, use of, or disclosure of the Confidential Information.</p>

<p><strong>Processing tools.</strong> Client acknowledges that Consultant may use third-party transcription, recording, storage, and analysis tools in performing the Consultation. Consultant shall use only tools that are subject to commercially reasonable confidentiality and security terms and that do not grant the provider rights to use Client&rsquo;s content for unrelated purposes.</p>

<h2>5. Anonymized and Aggregated Data</h2>

<p><strong>(a) Definition.</strong> &ldquo;Anonymized Data&rdquo; means data derived from the Call Materials from which all direct and reasonably identifying information has been removed, including names of individuals and organizations, contact information, dollar amounts tied to an identified party, and any other detail that could reasonably be used to identify Client, Client&rsquo;s agency, or any prospect, client, or participant. Anonymized Data includes, by way of example: call length and duration; talk-time ratios; call structure, sequence, and pacing; question types and counts; objection categories; topic and phrase patterns; outcome categories; and similar structural or statistical metrics.</p>

<p><strong>(b) License and Permitted Use.</strong> Client grants Consultant a perpetual, irrevocable, worldwide, royalty-free right to create, retain, use, analyze, and disclose Anonymized Data for research, benchmarking, analytics, product and methodology development, training, and the creation of aggregated insights, benchmarks, and educational or marketing content.</p>

<p><strong>(c) Aggregation.</strong> Any Anonymized Data that Consultant publishes or discloses externally will be presented only in aggregated form combined with data from other sources, such that no individual Party, call, or participant can be identified.</p>

<p><strong>(d) No Re-Identification.</strong> Consultant shall not attempt to re-identify Anonymized Data, and shall not disclose Anonymized Data in a manner that identifies Client or any participant, without Client&rsquo;s prior written consent.</p>

<p><strong>(e) Ownership and Survival.</strong> Consultant owns the Anonymized Data it creates. Consultant&rsquo;s rights under this Section 5 survive the deletion required by Section 6 and the termination or expiration of this Agreement.</p>

<h2>6. Deletion of Identifying Data</h2>

<p>Within <strong>thirty (30) days</strong> after the conclusion of the Consultation, or earlier upon Client&rsquo;s written request, Consultant shall permanently delete all Call Materials and all Confidential Information in identifiable form from its systems and those of its service providers, and shall certify such deletion in writing if Client requests it.</p>

<p>This deletion obligation does not apply to (i) Anonymized Data created under Section 5, (ii) Consultant&rsquo;s own work product, notes, and deliverables in de-identified form, and (iii) copies contained in routine, non-targeted automated backups, which remain subject to the confidentiality obligations of this Agreement until overwritten in the ordinary course.</p>

<h2>7. Client Representations</h2>

<p>Client represents and warrants that it has all rights, permissions, and consents necessary to record the calls comprising the Call Materials and to share them with Consultant, including any consent required from call participants under applicable recording, wiretap, and privacy laws. Client shall indemnify and hold Consultant harmless from any claim arising out of Client&rsquo;s failure to obtain such rights or consents.</p>

<h2>8. Consultant&rsquo;s Materials</h2>

<p>Any frameworks, scorecards, templates, methodologies, and materials Consultant provides to Client in connection with the Consultation remain Consultant&rsquo;s property. Client may use them internally but shall not publish, resell, or distribute them externally without Consultant&rsquo;s prior written consent.</p>

<h2>9. No License; No Warranty</h2>

<p>Except as expressly stated in Section 5, no license or right under any patent, copyright, trademark, trade secret, or other intellectual property right is granted or implied by this Agreement. All Call Materials are provided &ldquo;AS IS,&rdquo; and Client makes no warranty as to their accuracy or completeness.</p>

<h2>10. Term</h2>

<p>This Agreement begins on the Effective Date and continues until the Consultation concludes. Consultant&rsquo;s confidentiality obligations survive for <strong>two (2) years</strong> thereafter, except that Confidential Information constituting a trade secret remains protected for as long as it qualifies as a trade secret under applicable law. Sections 5, 7, 8, 11, and 12 survive termination.</p>

<h2>11. Remedies</h2>

<p>Each Party acknowledges that a breach of this Agreement may cause irreparable harm for which monetary damages would be an inadequate remedy. Accordingly, the non-breaching Party is entitled to seek injunctive or other equitable relief, in addition to any other remedies available at law or in equity, without the necessity of posting a bond.</p>

<h2>12. Governing Law and Venue</h2>

<p>This Agreement is governed by and construed in accordance with the laws of the <strong>Commonwealth of Massachusetts</strong>, without regard to its conflict-of-laws principles. The Parties consent to the exclusive jurisdiction and venue of the state and federal courts located in <strong>Middlesex County, Massachusetts</strong>, and waive any objection to such venue.</p>

<h2>13. General</h2>

<p>(a) <strong>Entire Agreement.</strong> This Agreement is the entire agreement between the Parties regarding its subject matter and supersedes all prior or contemporaneous understandings, whether written or oral.</p>

<p>(b) <strong>Amendment; Waiver.</strong> Any amendment must be in writing and signed by both Parties. No failure or delay in exercising any right operates as a waiver of it.</p>

<p>(c) <strong>Assignment.</strong> Neither Party may assign this Agreement without the other Party&rsquo;s prior written consent, except to a successor in connection with a merger, acquisition, or sale of substantially all assets.</p>

<p>(d) <strong>Severability.</strong> If any provision is held unenforceable, it will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will remain in full force and effect.</p>

<p>(e) <strong>Counterparts; Electronic Signatures.</strong> This Agreement may be executed in counterparts, each of which is deemed an original. Signatures delivered electronically or by PDF are as effective as original signatures.</p>

<p>(f) <strong>Notices.</strong> Notices must be in writing and sent to the addresses above, or to an email address the Parties designate in writing, and are effective upon receipt.</p>

<div class="sig-block">
  <p><strong>IN WITNESS WHEREOF</strong>, the Parties have executed this Agreement as of the Effective Date.</p>
  <p><strong>For {{client_legal_name}}</strong><br/>
     Signature: {{sig_client}}<br/>
     Name: ____________________<br/>
     Title: ____________________<br/>
     Date: {{date_client}}</p>
  <p><strong>For KLRY LLC</strong><br/>
     Signature: <em>Tim Kilroy</em><br/>
     Name: Tim Kilroy<br/>
     Title: CEO<br/>
     Date: {{effective_date}}</p>
</div>
`;
