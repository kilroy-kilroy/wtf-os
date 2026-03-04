# Instantly.ai Integration — Replace Apollo with Hybrid Approach

**Date:** 2026-03-04
**Status:** Approved

## Problem

Apollo API keys expired (401 errors in production). Apollo charges per-credit for company + contact enrichment. Instantly.ai is cheaper and has waterfall email enrichment from 5+ providers.

## Decision

**Hybrid approach:** Use Instantly for contact enrichment only (email, title, LinkedIn, employment history). Drop Apollo company enrichment — Perplexity + website tech sources already cover company intel.

## What Changes

### Remove
- `enrichCompanyWithApollo()` function and its usage
- `enrichCompanyWithApollo` calls in both Lite and Pro paths
- `APOLLO_API_KEY` dependency (can keep as dead code initially)

### Add
- `enrichContactWithInstantly(contactName, companyDomain)` in `packages/utils/research.ts`
- Uses Instantly SuperSearch API: `POST /api/v2/supersearch-enrichment/enrich-leads-from-supersearch`
- Search filters: `{ name: [contactName], domains: [domain] }`
- Options: `work_email_enrichment: true`, `fully_enriched_profile: true`, `limit: 1`
- Fetches enriched lead via `GET /api/v2/leads?list_id={id}`
- Maps response into existing `ApolloContactData` interface shape
- `INSTANTLY_API_KEY` env var

### Keep Unchanged
- `ApolloContactData` interface (or rename to `EnrichedContactData`)
- `enriched_contact` field in `DiscoveryLabPromptParams`
- All prompt templates and formatting functions
- `enriched_company` — now populated only when Perplexity data is available (narrative, not structured)

## Data Flow

```
Before:
  Apollo company enrichment → enriched_company → prompt
  Apollo contact enrichment → enriched_contact → prompt

After:
  (removed — Perplexity covers company intel)
  Instantly SuperSearch     → enriched_contact → prompt (same shape)
```

## Instantly API Integration

1. POST to `/api/v2/supersearch-enrichment/enrich-leads-from-supersearch`
   - Auth: `Authorization: Bearer <INSTANTLY_API_KEY>`
   - Body: `{ search_filters: { name: ["Name"], domains: ["domain.com"] }, work_email_enrichment: true, fully_enriched_profile: true, limit: 1, list_name: "discovery-{timestamp}" }`
2. Response returns `{ leads_added, leads_enriched }` + list info
3. Fetch lead data: `GET /api/v2/leads?list_id={id}&limit=1`
4. Map lead fields → `EnrichedContactData`
5. Graceful null return on any failure

## Files Touched

| File | Change |
|------|--------|
| `packages/utils/research.ts` | Add `enrichContactWithInstantly()`, deprecate Apollo functions |
| `apps/web/app/api/analyze/discovery/route.ts` | Replace Apollo calls with Instantly, remove `enriched_company` from Apollo |
| `.env.example` | Add `INSTANTLY_API_KEY` |

## Risks

- **Async latency**: SuperSearch enrichment is async. Unknown actual latency. Mitigated by 240s chain timeout.
- **Unknown response shape**: Can't scrape Instantly docs. Will log raw responses and iterate.
- **List cleanup**: Each enrichment creates a throwaway list in Instantly. May need periodic cleanup.
