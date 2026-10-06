# Labs security and analysis changes — 2026-10-06

Status: required Labs access SQL deployed to the production wtf-os Supabase project on 2026-10-06 at 19:29 UTC (migration 20261006192925). Labs application changes remain undeployed. Dependency fixes shipped separately in PR #214. Historical scores were not changed.

## Security and access

- Pro generation checks the authenticated account's product entitlement on the server. Personal, team, and Stripe entitlements are combined.
- Reports, transcripts, scores, exports, and coaching require the owner or a scoped guest capability. Submitted email, agency name, and report IDs do not grant access.
- Guests retain the free experience with a protected browser cookie and separate seven-day report links. Link hashes are stored; grants can be revoked through `lab_access_grants.revoked_at`.
- Database migration replaces permissive Lab policies, limits child-table reads, and prevents client promotion to Pro/admin or subscription/team mutation.
- Paid requests have body limits and atomic database quotas. Scheduled coaching fails closed without its secret. The legacy arbitrary-report importer is retired.
- Public website research validates and pins public DNS addresses across redirects, bounds time and response size, and rejects local/private destinations. PDF rendering accepts authorized saved reports, escapes HTML, disables JavaScript, and blocks network requests.
- Newsletter enrollment now requires explicit opt-in. Existing automatic newsletter enrollment is removed from Call Lab.

## Analysis and utility

- Call feedback uses call stage, intended outcome, and transcript completeness; exact rewrites are checked against the transcript. Unsupported measurements remain missing rather than invented midpoint scores.
- Pro overall score is computed from observed dimensions. Positive patterns do not count as risks. Coaching deduplicates calls, preserves missing dimensions, and stops presenting fabricated baseline improvement.
- Lite reports focus on a useful correction and practice; Pro adds focused evidence, rewrites, and next-call preparation. Diagnostic generosity and paid implementation boundaries are distinguished.
- Discovery research retains citations, retrieval time, and failure state. Reports distinguish facts from hypotheses, include alternative explanations and disconfirming questions, and allow no-fit outcomes.
- Research and model requests have deadlines and smaller output budgets; truncated model output is rejected. Exports preserve the new report sections.

## Validation

- Web suite: 342 tests passed, three skipped (including opt-in live model test).
- Utility suite: 49 tests passed.
- TypeScript and production Next.js build passed.
- Isolated PostgreSQL/PGlite migration tests passed for owner/guest isolation, child records, privilege escalation attempts, allowed outcome updates, quotas, score repair, and repeatable score repair.
- Live synthetic model smoke test passed for Call Lite, Call Pro JSON, and Discovery Pro. No customer data, CRM writes, or emails were used. This is a small smoke test, not a statistical accuracy evaluation.

## Release procedure

1. Back up the database and compare the live schema with the migration assumptions. The SQL test uses representative fixtures, not a production clone. Check existing users/profile policies and the columns named by the migration. Confirm existing server-side onboarding/admin/billing paths still work with browser write privileges removed.
2. Completed: `supabase/migrations/20261006192925_labs_access.sql` was applied before app deployment. Missing capability/quota tables intentionally block affected requests. Coordinate the migration and app deployment to minimize the interval where old pages encounter stricter policies.
3. Apply `20261006_labs_score_repair.sql` if historical Markdown score repair is desired. It records previous values and repairs only explicit valid /10 scores, without model calls or emails. It does not regenerate historical coaching reports.
4. Deploy this branch. Verify CRON_SECRET and the existing Supabase service role configuration. No new secret is required. The IP quota assumes deployment behind Vercel's trusted request headers; configure equivalent trusted identity before deploying elsewhere.
5. Verify end-to-end in the deployed environment: guest Lite generation and emailed link; expired/revoked link denial; signed-in owner access; another account denied; each Pro subscription allowed only for its product; PDF export; scheduled coaching with and without its secret; profile editing and onboarding.

Historical guest URLs without a capability no longer grant access. Owner accounts retain authenticated access. Guest report links are bearer links and can be forwarded until expiry or revocation. No self-service link revocation UI is included.

The SQL rollout is complete; the Labs application rollout, historical coaching regeneration, full research-provider integration test, and browser end-to-end validation are still outstanding. Prior-period coaching comparisons remain unavailable when no comparable baseline is present. Broader marketing/MCP/open-source work remains a separate project.

## Dependency security follow-through

The clean lockfile update includes Next.js 16.3.8, sharp 0.35.5, and patched compatible transitive dependencies. The registry audit fell from 28 affected packages (one critical) to 17 (zero critical, 14 high, three moderate). GitHub counts individual advisories differently from npm's affected-package count.

Remaining alerts are concentrated in Tailwind/ESLint glob and CSS parser tooling, and Puppeteer's browser-download/proxy/archive dependency chain. The Labs PDF path launches the bundled Chromium binary and does not accept archives or invoke browser downloads; it also blocks page network access. This is a reachability mitigation, not a claim that the vulnerable packages are patched. Removing these alerts requires a separately tested Tailwind/tooling and Puppeteer/Chromium upgrade. Do not describe this branch as a clean dependency audit.

## Production SQL verification — October 6

Confirmed the target project matches the app configuration. All required tables/columns were present; no conflicting tables, functions, or user trigger existed. Saved the original catalog access configuration locally before applying the migration as one transaction.

Verified live: two service-only tables with RLS; six owner-read policies; two parent-owner child policies; no anonymous score/instant-report reads; no client access to guest grants or quota RPC; report owner cannot be reassigned; outcome updates remain allowed; user privilege trigger enabled. A rolled-back test confirmed non-owner call/discovery reads returned zero rows, admin self-promotion was rejected, and quota requests one/two passed while three failed. No verification quota rows remain. Optional historical-score repair was not applied.

The Supabase advisor reports informational no-policy notices for the two new service-only tables, which is intentional. It also reports eight existing functions without fixed search paths and existing Auth settings for long OTP expiry and disabled leaked-password protection. These objects/settings were not changed by this migration. References: [function search-path remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [Auth production settings](https://supabase.com/docs/guides/platform/going-into-prod#security), [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This is verification of the requested migration, not a clean security audit of the entire project.
