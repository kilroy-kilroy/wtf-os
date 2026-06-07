# Loops Events & Fields Reference

Authoritative inventory of every Loops.so event the app fires, extracted from
`apps/web/lib/loops.ts`. Keep this in sync when you add/change a `sendEvent(...)`
call.

**Key concept:** the client-portal lifecycle events are *shared* across all
program families (Agency Studio, DemandOS, SalesOS). They differ only by the
`programName` field value. Program names live in `client_programs`:
`Agency Studio`, `Agency Studio+`, `DemandOS Growth/Studio/Team`,
`SalesOS Growth/Studio/Team`.

All fields are strings unless marked `(number)`. 🆕 = added/changed 2026-06-07.

---

## 1. Shared client lifecycle — Agency Studio, DemandOS, SalesOS

| Event name | Fields | Fired from |
|---|---|---|
| 🆕 `client_invited` | `firstName`, `programName`, `activationUrl` | `api/client/invite`, `api/client/invite/resend` |
| 🆕 `client_password_reset` | `firstName`, `resetUrl`, `expiresInMinutes` (number) | `api/client/reset-request`, `api/client/invite/resend` |
| `client_onboarded` | `firstName`, `programName`, `companyName`, `dashboardUrl` | `api/client/onboarding` |

> `client_invited` previously sent `loginUrl` (a Supabase magic link) — replaced
> by **`activationUrl`** (`/client/activate?token=…`). `client_password_reset` is
> new. These two are the only client-portal Loops changes from the 2026-06-07
> self-service-password migration.

## 2. Agency Studio only (`agency-studio`, `agency-studio-plus` — Five-Minute Friday)

| Event name | Fields | Fired from |
|---|---|---|
| `five_minute_friday_reminder` | `firstName`, `programName`, `submitUrl` | `api/cron/five-minute-friday` |
| `five_minute_friday_response` | `weekOf`, `responsePreview`, `viewUrl` | `api/client/five-minute-friday/respond` |

## 3. DemandOS only (`demandos-*` — intake form)

| Event name | Fields | Fired from |
|---|---|---|
| `demandos_intake_submitted` | `companyName`, `programName`, `enrollmentId`, `reviewUrl` | `api/client/demandos-intake/submit` |

## 4. SalesOS clients (`salesos-*`) + any coached client (Call Lab Pro)

| Event name | Fields | Fired from |
|---|---|---|
| `coaching_weekly_ready` | `reportId`, `reportUrl`, `periodStart`, `periodEnd`, `firstName`, `oneThingBehavior`, `oneThingDrill` | `api/cron/coaching-weekly` |
| `coaching_monthly_ready` | *(same as weekly)* | `api/cron/coaching-monthly` |
| `coaching_quarterly_ready` | *(same as weekly)* | `api/cron/coaching-quarterly` |
| `outcome_nudge` | `firstName`, `callDate`, `prospect`, `updateUrl`, `callId` | `api/cron/outcome-nudge` |

---

## 5. Assessment / tool onboarding (lead-gen, pre-client)

| Event name | Fields |
|---|---|
| `call_lab_signup` | `firstName`, `companyName`, `tier` |
| `first_call_analysis` | *(no fields)* |
| `report_generated_lite` | `reportId`, `reportUrl`, `reportType`, `prospectName`, `companyName`, `archetype`, `executionScore` (number), `positioningScore` (number) |
| `report_generated_pro` | *(same as lite)* |
| `assessment_completed` *(GrowthOS agency assessment)* | `firstName`, `agencyName`, `assessmentId`, `overallScore` (number), `resultsUrl`, `archetype`, `executionScore` (number), `positioningScore` (number) |
| `bizDevReportGenerated` *(Biz Dev Assessment → Agency Studio/Growth funnel)* | `name`, `verdict`, `stage`, `composite`, `cta_tier`, `dominant_trap`, `top_gap_1`, `top_gap_2`, `top_gap_3`, `magic_link_url` |
| `discovery_report_generated_lite` *(SalesOS Discovery Lab)* | `reportType`, `targetCompany`, `targetContact`, `targetContactTitle`, `reportId`, `reportUrl`, `archetype`, `executionScore` (number), `positioningScore` (number) |
| `discovery_report_generated_pro` | *(same as lite)* |
| `visibility_report_generated` *(Visibility Lab)* | `reportId`, `reportUrl`, `visibilityScore` (number), `brandName`, `archetype`, `executionScore` (number), `positioningScore` (number) |
| `visibility_pro_report_generated` *(DemandOS Visibility Lab Pro)* | `reportId`, `reportUrl`, `reportType`, `kviScore` (number), `brandName`, `diagnosisSeverity`, `brandArchetype`, `archetype`, `executionScore` (number), `positioningScore` (number) |
| `upgraded_to_pro` | `planType`, `product` |
| `growthos_bundle_purchased` | `planType`, `product`, `includedProducts` |
| `subscription_cancelled` | *(no fields)* |

---

## Contact custom properties

Set via `createOrUpdateContact` / `updateContact`; usable in any template:

`firstName`, `lastName`, `source`, `subscribed`, `userGroup`, `callLabTier`,
`companyName`, `role`, `salesTeamSize`, `signupDate`, `enrolledProgram`,
`clientLoginUrl`

`userGroup` values used for segmentation: `client`, `call_lab_free`,
`call_lab_pro`, `discovery_lab_pro`, `visibility_lab_pro`, `salesos_pro`,
`growthos_pro`, `growthos_assessment`, `call_lab_churned`.

`clientLoginUrl` now holds the stable `/client/login` URL (no longer a magic link).

---

## Notes

- Loops registers an event name and its data variables the first time it
  *receives* that event via `POST /v1/events/send`. There is no separate
  "define event schema" API — to seed an event's variables into the template
  editor, send one event carrying all its fields.
- `bizDevReportGenerated` and the `*_report_generated_*` events still deliver a
  `magic_link_url` (lead-gen tool access link). This is a *separate* flow from
  the client portal and was NOT changed by the 2026-06-07 migration.
- Every event send is also written to the `loops_events` table for an admin
  audit trail (`lib/loops.ts` `sendEvent`).
