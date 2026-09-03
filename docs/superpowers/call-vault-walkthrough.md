# Call Vault — manual walkthrough

Run this after the automated gates (`npx tsc --noEmit`, `npx vitest run` from
`apps/web/`) are green. Those check pure logic; this checks the parts that
only exist once real Supabase, Firma, Beehiiv, Slack, and Loops are wired up
together — the migration applied, the NDA template seeded, and a browser
actually driving the form.

Assumes you know the codebase (routes under `apps/web/app/api/call-vault/`,
tables in `supabase/migrations/20260903_create_call_vault.sql`) but have not
been following this build day to day. Every step names the exact command/SQL
and the exact expected result, and says what a different result means.

Do this in order — later steps depend on earlier ones (you need a signed NDA
before you can test resume; you need a submission before you can test the
admin pages).

---

## 1. Apply the migration

The migration was written but deliberately **not applied** by the build —
that was left to you, on purpose (DDL against prod is not something an agent
should do unattended).

```bash
cd /Users/timkilroy/Projects/wtf-os
npx supabase db push
```

(or paste the contents of `supabase/migrations/20260903_create_call_vault.sql`
into the Supabase SQL editor for the linked project.)

**Verify the three tables exist**, in the Supabase SQL editor:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('call_vault_contributors', 'call_vault_calls', 'call_vault_files')
order by table_name;
```
Expected: all three rows come back. If any is missing, the push didn't run or
failed silently — check the CLI output.

**Verify the private 200MB bucket exists:**

```sql
select id, name, public, file_size_limit
from storage.buckets
where id = 'call-vault';
```
Expected: one row — `public = false`, `file_size_limit = 209715200`.

If a bucket named `call-vault` **already existed** before this migration
(e.g. created manually), the insert uses `on conflict (id) do nothing`, so
`public`/`file_size_limit` will NOT be updated to the migration's values —
this row would then show whatever the pre-existing bucket had. That's a known
minor from the ledger (Task 8), not a bug in this run; if you see a limit
other than 209715200 here, just update the bucket's settings by hand in the
Storage UI.

---

## 2. Seed the NDA template

```bash
cd /Users/timkilroy/Projects/wtf-os
npx tsx scripts/seed-call-vault-nda.ts
```
Expected stdout: `Seeded contract template: call-vault-nda`. The script needs
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell env
(it doesn't read `.env.local` itself — export them first, or run it through
whatever wrapper you normally use to load that repo's env for one-off
scripts).

**Verify the row:**

```sql
select slug, name, is_active, jsonb_array_length(variables) as var_count
from contract_templates
where slug = 'call-vault-nda';
```
Expected: one row — `name` = `Confidentiality and Data Use Agreement (Call
Recordings and Transcripts)`, `is_active = true`, `var_count = 3` (
`client_legal_name`, `client_address`, `effective_date`).

Re-running the script is safe — it upserts on `slug`.

If you skip this step, the NDA modal in the browser will still open, but
clicking "Continue to sign" will show: *"NDA template not seeded — run
scripts/seed-call-vault-nda.ts"*. That message is the route's own check
(`apps/web/app/api/call-vault/nda/route.ts`), so seeing it means exactly what
it says — nothing else to debug.

---

## 3. Set FIRMA_ENV=test before any signing

```bash
export FIRMA_ENV=test
```

`FIRMA_ENV` defaults to `test` when unset (`apps/web/lib/firma.ts`), so this
is mostly a safety confirmation, not a real change — but say it out loud
before you start, because getting this wrong is expensive and irreversible:

- **test**: uses `FIRMA_API_KEY_TEST`. Signed PDFs come back watermarked
  ("TEST" overlay), and Firma does not deduct a paid credit per envelope.
- **live**: uses `FIRMA_API_KEY_LIVE`. Every NDA generated in this walkthrough
  — including ones you abandon mid-test — becomes a real, billed, legally
  valid document.

Confirm whichever environment you're running against has its key set:
`FIRMA_API_KEY_TEST` (or `FIRMA_API_KEY_LIVE` if you deliberately flip later).
Do not flip to `live` until every step below has passed once in `test`.

---

## 4. First-time contributor path

With the app running against this Supabase project:

1. Open `/call-vault`. Expected: dark hero page, "The Call Vault" heading,
   "Hand over a few calls, get a plan back."
2. Fill in **About you**: name, email, at least one service checkbox, and
   check the consent checkbox ("I have the rights and consents necessary to
   share these calls..."). Click **Continue**.
   - Expected: the form advances to the calls phase, one blank call card
     showing.
   - If you instead see **"Check your inbox"** — that means this email
     already has a contributor row (see step 10 below on why). Use a fresh
     email address to run steps 4–9 the first time.
3. Click **Sign the NDA**. Enter a legal entity name and a business address,
   click **Continue to sign**.
   - Expected: an iframe loads showing the Firma signing UI, watermarked
     "TEST" if `FIRMA_ENV=test` is really in effect.
4. Sign inside the iframe (draw/type a signature, submit).
   - Expected: the modal shows "Confirming your signature…" briefly, then
     closes and the calls panel shows **"NDA signed ✓ — thank you."**
   - This confirmation is NOT just trusting Firma's postMessage — the app
     re-polls Firma's own API (`syncStatus` in `lib/contracts/service.ts`)
     before it will show "signed". If it instead shows the "still confirming,
     click to check again" panel for more than a few seconds, click **Check
     again** once.
5. Add two calls. On the first, fill in stage/outcome/etc. (optional but
   worth exercising) and upload a `.txt` file. On the second, upload an
   `.mp3` file.
   - Expected per upload: a progress indicator, then the file listed against
     that call card. No error.
6. Click **Submit for review**.
   - Expected: the page moves to **"You're in."** — thanks message,
     mentions the improvement plan and review call.

---

## 5. Confirm NO signing email arrived

This is the single most important check in this entire plan — the whole
feature exists to let someone sign an NDA without an email round trip.

Check the inbox for whatever address you used as the contributor's email in
step 4.2 (and check Tim's own inbox if Firma CCs the account owner on new
envelopes, and any Firma dashboard "sent" log for that env).

**Expected: nothing.** No "please sign" email, no Firma notification email,
no envelope-sent confirmation.

If a signing email DID arrive, that's a real defect — it means
`sendSigningRequest` got called somewhere on this path (it must never be,
per `generateForEmbeddedSign` in `apps/web/lib/contracts/service.ts`, which
creates the envelope but stops short of sending it). Do not proceed past this
step if that happens — flag it, don't try to "just not click send" next time.

---

## 6. Confirm a .mp4 is rejected

On any call card, try to upload a `.mp4` file (any small dummy file with that
extension is fine — the check runs on extension/mime before any upload
happens).

Expected error message, verbatim:
> Video is not accepted. Please export the audio or the transcript.

This check runs both client-side (`classifyFile` imported straight from the
server module, so there's no copy to drift) and server-side in
`POST /api/call-vault/files` before a signed upload URL is even issued — so
even a browser with client JS disabled/bypassed gets the same rejection.

---

## 7. Confirm the database side

Using the contributor's email from step 4, in the Supabase SQL editor:

```sql
select id, name, email, status, submitted_at, nda_signed_at, nda_contract_id
from call_vault_contributors
where email = 'YOUR_TEST_EMAIL';
```
Expected: one row — `status = 'submitted'`, `submitted_at` set,
`nda_signed_at` set, `nda_contract_id` not null. Copy the `id` — call it
`<contributor_id>` — for the next queries.

```sql
select id, stage, outcome, created_at
from call_vault_calls
where contributor_id = '<contributor_id>';
```
Expected: 2 rows (one per call added in step 4.5).

```sql
select f.id, f.kind, f.file_name, f.storage_path, f.size_bytes
from call_vault_files f
join call_vault_calls c on c.id = f.call_id
where c.contributor_id = '<contributor_id>';
```
Expected: 2 rows — one `kind = 'transcript'` (the `.txt`), one
`kind = 'audio'` (the `.mp3`). `storage_path` for each should look like
`<contributor_id>/<call_id>/<uuid>-<sanitized filename>`.

**Confirm the object is really in Storage**, not just the DB row: in the
Supabase dashboard, Storage → `call-vault` bucket → navigate to
`<contributor_id>/`. You should see both files physically present, sized
sensibly (not 0 bytes).

```sql
select id, status, signed_pdf_path
from contracts
where id = (select nda_contract_id from call_vault_contributors where id = '<contributor_id>');
```
Expected: `status = 'completed'`, `signed_pdf_path` is a non-null storage
path (the signed PDF was pulled from Firma and stored — this is what powers
the "Download" link on the admin detail page in step 11).

---

## 8. Confirm the fan-out

All four legs below fire from `captureCallVaultLead`
(`apps/web/lib/call-vault/lead.ts`) inside `waitUntil`, so they can land a few
seconds after the "You're in." screen appears — give it 10–15 seconds before
checking.

- **Beehiiv**: in the Beehiiv dashboard, search subscribers for the test
  email. Expected: present, with `utm_source = call_vault`,
  `utm_campaign = call_vault_contribution`, and (if you set an agency name in
  step 4.2) a `company` custom field populated with it.
- **Slack**: check whatever channel `alertReportGenerated` posts to.
  Expected: a message naming the contributor and "Call Vault" (the label
  added to the product map in Task 7) — not a raw `call-vault` slug.
- **`loops_events` row**:
  ```sql
  select event_name, user_email, event_data, created_at
  from loops_events
  where event_name = 'call_vault_submitted'
    and user_email = 'YOUR_TEST_EMAIL'
  order by created_at desc
  limit 1;
  ```
  Expected: one row, recent, `event_data` containing `callCount: 2`,
  `ndaSigned: true`, a `resumeUrl`, and a `bookingUrl`.

If the Slack/Beehiiv/Loops calls fail (e.g. missing API keys in this
environment), the submission itself must NOT have failed — "You're in."
should still have appeared in step 4.6. If it didn't, that's a real defect:
the fan-out is supposed to be fully non-blocking.

---

## 9. The resume path

Grab the `resumeUrl` from the `loops_events` row's `event_data` in step 8 (or
construct it: `<app-url>/call-vault?token=<access_token from step 8's mint>` —
easier to just read it out of `event_data.resumeUrl`).

1. Open that URL in a **fresh browser context** (incognito, or clear
   sessionStorage first) — you want to prove the link itself works, not that
   your existing session carried you through.
2. Expected: the page briefly shows "Restoring your session…", then lands on
   the calls phase with:
   - **"NDA signed ✓ — thank you."** already showing (no re-signing prompt).
   - A **"Calls you've already saved (2)"** panel listing both calls from
     step 4, read-only, with correct file counts.
   - One blank call card ready for more uploads.
3. **This is the step the code review could not verify statically** — the
   resume route's compare-and-swap uses
   `.is('access_token_used_at', null)` rather than `.eq('access_token_used_at', null)`
   (see `apps/web/app/api/call-vault/resume/route.ts`). If this behaves
   unexpectedly, the failure mode to watch for is: **the FIRST, legitimate
   use of this link gets rejected** with `{"error": "That link has expired"}`
   / 401, even though the token was never used before. If that happens on
   the very first open, that is the bug to report — do not retry it "just in
   case," since retrying would exercise a different (correctly-expected)
   code path.
4. Reload the exact same URL again (same token in the address bar).
   Expected: **rejected** — `{"error": "That link has expired"}`, 401, and
   the UI should fall back to the "about you" phase, not silently show a
   blank calls screen. This is the single-use guarantee: a second open of the
   same link must not work.

---

## 10. Re-submitting the same email at /start

Go back to `/call-vault` fresh (no token in the URL) and submit **About you**
again using the *same* email address you used in step 4.

Expected:
- The response body is `{"resumeEmailed": true}` (visible in Network tab if
  you want to confirm the wire shape).
- The UI shows the **"Check your inbox"** panel: *"We already have a
  submission going for that email. We just emailed you a link to pick up
  right where you left off — no need to start over."*
- It must NOT drop you into the calls phase directly — that would mean an
  unverified caller who merely knows an email address got a live session
  bound to someone else's data, which is the exact account-takeover hole this
  code was specifically hardened against (see Task 8 in the ledger).
- Check the inbox again: a **new** resume-link email should arrive (event
  name `call_vault_resume_link` in `loops_events`), distinct from the
  original submission's thank-you email.
- Note: doing this twice within about an hour will NOT re-send — the second
  attempt inside that window still returns `{"resumeEmailed": true}` but
  withholds the email, to stop a hammering loop from invalidating the
  contributor's own live link. If you don't see a second email on a second
  immediate attempt, that's expected, not a bug — wait an hour or use the
  `access_token` update timestamp in the DB to confirm nothing else broke.

---

## 11. /admin/call-vault as an admin

Log in as `tim@timkilroy.com` (or whichever account has `is_admin = true`)
and open `/admin/call-vault`.

Expected:
- The contributor from step 4 appears in the list, with agency name/revenue
  band, a call count, **"NDA ✓"**, and a **submitted** badge.
- Click into the row → `/admin/call-vault/<id>`.
  - Expected: Profile panel shows agency/services/revenue band/target client
    as **human-readable labels** (e.g. "$1M–$5M", not a raw slug like
    `1m_5m`) — this is `labelFor` from `lib/call-vault/vocabularies.ts`
    doing its job. If you see a raw slug anywhere on this page, that's a
    defect.
  - NDA panel shows "Signed · <timestamp>", the legal name/address you
    entered, and a **Download** link.
  - Click Download on the signed PDF. Expected: it opens/downloads the
    actual signed, watermarked (test-mode) PDF.
  - Under Calls, click a file download link (`/api/admin/call-vault/files/<fileId>`).
    Expected: redirects to a working file (your uploaded `.txt` or `.mp3`).
  - **Copy that resolved download URL** (the one you land on after the
    redirect) and try it again in a new tab **5+ minutes later**. Expected:
    it now fails (signed URL expired — the route mints a 300-second TTL).
    Reloading `/api/admin/call-vault/files/<fileId>` itself, however, should
    keep working indefinitely (it mints a fresh signed URL each time) as
    long as you're still logged in as admin.

**Known environment risk — read before treating a 403 as a bug:** this repo
has a previously-recorded issue where `tim@`'s `auth.users` id differs from
his `public.users` row id, which can break `is_admin` gating anywhere under
`/admin`. If `/admin/call-vault` (or its detail page) returns a 403/redirect
for Tim specifically, that is this pre-existing drift, not a defect
introduced by Call Vault. Cross-check by confirming whether Tim can reach
any *other* `/admin/*` page — if those are also broken, it's the drift; if
Call Vault is the only one failing, treat it as a real bug in this code.

---

## 12. Loops automation — required follow-up, not a bug

Firing `call_vault_submitted` (step 8) writes the event to Loops and to the
`loops_events` audit table, but **no automation is wired to it yet**. Until
someone builds a Loops automation triggered on `call_vault_submitted` (using
`eventProperties.bookingUrl` and `eventProperties.resumeUrl` in the email
body), the contributor's "thank you" email will not actually send, even
though every check in step 8 passes. This has to be built by hand in the
Loops dashboard — it is out of scope for this codebase and is not something
to chase as a bug during this walkthrough.

The same is true, less critically, for `call_vault_resume_link` (step 10) —
Loops needs an automation on that event name too, or a returning contributor
never actually receives their resume link even though the event fires
correctly.

---

## After a clean run

Once steps 1–11 all pass and you're satisfied:

```bash
export FIRMA_ENV=live
```

...only after everything above has been verified once against `test`. Every
NDA generated from this point on is a real, billed document.
