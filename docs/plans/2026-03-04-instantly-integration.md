# Instantly.ai Contact Enrichment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Apollo with Instantly.ai for contact enrichment in the Discovery Lab research chain. Drop Apollo company enrichment (Perplexity covers it).

**Architecture:** Add `enrichContactWithInstantly()` to `packages/utils/research.ts` that calls Instantly's SuperSearch API to find a person by name + domain, then fetches the enriched lead data. Reuse existing `ApolloContactData` interface shape so downstream prompt formatting is unchanged. Remove Apollo calls from both Lite and Pro paths.

**Tech Stack:** Instantly.ai API v2, fetch, TypeScript

---

### Task 1: Add Instantly contact enrichment function

**Files:**
- Modify: `packages/utils/research.ts` (add after Apollo section, ~line 700)

**Step 1: Add the `enrichContactWithInstantly` function**

Add this after the existing Apollo section (after `formatEmployeeCount` around line 711):

```typescript
// ============================================================================
// INSTANTLY.AI API - Contact Enrichment via SuperSearch
// ============================================================================

/**
 * Enrich contact data using Instantly.ai SuperSearch API
 * Searches 450M+ contact database by name + domain, returns enriched profile
 * with waterfall email finding from 5+ providers
 */
export async function enrichContactWithInstantly(
  contactName: string,
  companyDomain: string
): Promise<ApolloContactData | null> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    console.warn('INSTANTLY_API_KEY not set, skipping Instantly enrichment');
    return null;
  }

  try {
    // Split name for search
    const nameParts = contactName.trim().split(/\s+/);
    const searchName = contactName.trim();

    // Step 1: Search SuperSearch and enrich
    const listName = `discovery-enrichment-${Date.now()}`;
    console.log(`[Instantly] Searching for: ${searchName} at ${companyDomain}`);

    const searchResponse = await fetch(
      'https://api.instantly.ai/api/v2/supersearch-enrichment/enrich-leads-from-supersearch',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          search_filters: {
            name: [searchName],
            domains: [companyDomain],
          },
          work_email_enrichment: true,
          fully_enriched_profile: true,
          limit: 1,
          skip_rows_without_email: false,
          list_name: listName,
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[Instantly] SuperSearch error: ${searchResponse.status} - ${errorText}`);
      return null;
    }

    const searchResult = await searchResponse.json();
    console.log('[Instantly] SuperSearch result:', JSON.stringify(searchResult).substring(0, 500));

    // Extract list/resource ID from response for lead fetch
    // Response shape is uncertain — log and adapt
    const resourceId = searchResult.resource_id || searchResult.list_id || searchResult.id;
    const leadsAdded = searchResult.leads_added || searchResult.total || 0;

    if (!leadsAdded || leadsAdded === 0) {
      console.warn(`[Instantly] No leads found for ${searchName} at ${companyDomain}`);
      return null;
    }

    // Step 2: Fetch the enriched lead from the list
    // Wait briefly for enrichment to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    let leadData: any = null;

    if (resourceId) {
      const leadsResponse = await fetch(
        `https://api.instantly.ai/api/v2/leads?list_id=${resourceId}&limit=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      if (leadsResponse.ok) {
        const leadsResult = await leadsResponse.json();
        console.log('[Instantly] Leads fetch result:', JSON.stringify(leadsResult).substring(0, 500));
        // Extract first lead — shape may be { items: [...] } or direct array
        const leads = leadsResult.items || leadsResult.leads || leadsResult;
        leadData = Array.isArray(leads) ? leads[0] : leads;
      } else {
        console.error(`[Instantly] Leads fetch error: ${leadsResponse.status} - ${await leadsResponse.text()}`);
      }
    }

    // If we couldn't fetch leads separately, try to use data from search response directly
    if (!leadData && searchResult.leads) {
      leadData = Array.isArray(searchResult.leads) ? searchResult.leads[0] : searchResult.leads;
    }

    if (!leadData) {
      console.warn('[Instantly] Could not retrieve lead data after enrichment');
      return null;
    }

    // Step 3: Map to ApolloContactData shape for compatibility
    return mapInstantlyLeadToContact(leadData, nameParts);
  } catch (error) {
    console.error('[Instantly] Contact enrichment error:', error);
    return null;
  }
}

/**
 * Map Instantly lead data to ApolloContactData interface
 * Instantly field names are uncertain — this handles multiple possible shapes
 */
function mapInstantlyLeadToContact(lead: any, nameParts: string[]): ApolloContactData {
  return {
    first_name: lead.first_name || lead.firstName || nameParts[0] || '',
    last_name: lead.last_name || lead.lastName || nameParts.slice(1).join(' ') || '',
    name: lead.name || lead.full_name || `${lead.first_name || nameParts[0] || ''} ${lead.last_name || nameParts.slice(1).join(' ') || ''}`.trim(),
    title: lead.title || lead.job_title || lead.position || '',
    email: lead.email || lead.work_email || '',
    linkedin_url: lead.linkedin_url || lead.linkedin || lead.li_url || '',
    headline: lead.headline || lead.title || lead.job_title || '',
    employment_history: parseInstantlyEmploymentHistory(lead),
    seniority: lead.seniority || lead.level || '',
    departments: lead.department ? [lead.department] : lead.departments || [],
    raw_data: lead,
  };
}

function parseInstantlyEmploymentHistory(lead: any): ApolloContactData['employment_history'] {
  // Instantly may provide employment_history, or just current title + company
  if (lead.employment_history && Array.isArray(lead.employment_history)) {
    return lead.employment_history.map((job: any) => ({
      title: job.title || '',
      organization_name: job.organization_name || job.company || '',
      start_date: job.start_date || '',
      end_date: job.end_date || null,
      current: job.current || false,
    }));
  }

  // Fallback: construct from current position
  if (lead.title || lead.job_title) {
    return [{
      title: lead.title || lead.job_title || '',
      organization_name: lead.company_name || lead.company || '',
      start_date: '',
      end_date: null,
      current: true,
    }];
  }

  return [];
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors related to the Instantly functions

**Step 3: Commit**

```bash
git add packages/utils/research.ts
git commit -m "feat: add Instantly.ai contact enrichment via SuperSearch API"
```

---

### Task 2: Wire Instantly into Discovery route (Pro path)

**Files:**
- Modify: `apps/web/app/api/analyze/discovery/route.ts` (lines 4-13 imports, lines 78-118 Pro path, lines 1777-1793 in research.ts)
- Modify: `packages/utils/research.ts` (lines 1777-1793 in `runV2DiscoveryResearch`)

**Step 1: Update `runV2DiscoveryResearch` to use Instantly instead of Apollo**

In `packages/utils/research.ts`, replace the Apollo enrichment block (lines 1777-1793) with Instantly:

Find:
```typescript
  // Apollo company enrichment
  if (domain) {
    promises.push(
      enrichCompanyWithApollo(domain)
        .then(r => { result.apollo_company = r; })
        .catch(e => { errors.push(`Apollo company failed: ${e.message}`); })
    );
  }

  // Apollo contact enrichment
  if (input.target_contact && domain) {
    promises.push(
      enrichContactWithApollo(input.target_contact, domain)
        .then(r => { result.apollo_contact = r; })
        .catch(e => { errors.push(`Apollo contact failed: ${e.message}`); })
    );
  }
```

Replace with:
```typescript
  // Contact enrichment via Instantly.ai (replaces Apollo)
  // Note: Apollo company enrichment removed — Perplexity covers company intel
  if (input.target_contact && domain) {
    promises.push(
      enrichContactWithInstantly(input.target_contact, domain)
        .then(r => { result.apollo_contact = r; })
        .catch(e => { errors.push(`Instantly contact enrichment failed: ${e.message}`); })
    );
  }
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
git add packages/utils/research.ts
git commit -m "feat: replace Apollo with Instantly in Pro research chain"
```

---

### Task 3: Wire Instantly into Discovery route (Lite path)

**Files:**
- Modify: `apps/web/app/api/analyze/discovery/route.ts` (lines 119-150 Lite path)

**Step 1: Update Lite path imports and enrichment calls**

In the import block at top of `route.ts`, replace `enrichCompanyWithApollo` with `enrichContactWithInstantly`:

Find:
```typescript
import {
  runModel,
  retryWithBackoff,
  enrichCompanyWithApollo,
  enrichContactWithApollo,
  fetchCompanyNews,
  runV2DiscoveryResearch,
  type V2ResearchResult,
} from '@repo/utils';
```

Replace with:
```typescript
import {
  runModel,
  retryWithBackoff,
  enrichContactWithInstantly,
  fetchCompanyNews,
  runV2DiscoveryResearch,
  type V2ResearchResult,
} from '@repo/utils';
```

Then update the Lite enrichment block. Find:
```typescript
      const results = await Promise.all([
        domain
          ? enrichCompanyWithApollo(domain).catch((e) => {
              console.warn('Apollo company enrichment failed:', e.message);
              return null;
            })
          : Promise.resolve(null),
        domain && target_contact_name
          ? enrichContactWithApollo(target_contact_name, domain).catch((e) => {
              console.warn('Apollo contact enrichment failed:', e.message);
              return null;
            })
          : Promise.resolve(null),
        fetchCompanyNews(target_company, domain).catch((e) => {
          console.warn('Perplexity news fetch failed:', e.message);
          return { recent_news: [] as any[], funding_info: null, raw_response: '' };
        }),
      ]);
      apolloCompany = results[0];
      apolloContact = results[1];
      newsData = results[2];
```

Replace with:
```typescript
      const results = await Promise.all([
        domain && target_contact_name
          ? enrichContactWithInstantly(target_contact_name, domain).catch((e) => {
              console.warn('Instantly contact enrichment failed:', e.message);
              return null;
            })
          : Promise.resolve(null),
        fetchCompanyNews(target_company, domain).catch((e) => {
          console.warn('Perplexity news fetch failed:', e.message);
          return { recent_news: [] as any[], funding_info: null, raw_response: '' };
        }),
      ]);
      apolloContact = results[0];
      newsData = results[1];
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/web/app/api/analyze/discovery/route.ts
git commit -m "feat: replace Apollo with Instantly in Lite discovery path"
```

---

### Task 4: Update environment config

**Files:**
- Modify: `.env.example` (line 12)

**Step 1: Replace Apollo with Instantly in .env.example**

Find:
```
# Data Enrichment (Discovery Lab)
APOLLO_API_KEY=your-apollo-api-key
```

Replace with:
```
# Data Enrichment (Discovery Lab)
INSTANTLY_API_KEY=your-instantly-api-key
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: replace APOLLO_API_KEY with INSTANTLY_API_KEY in env example"
```

---

### Task 5: Test live in production

**Step 1: Deploy to Vercel**

Ensure `INSTANTLY_API_KEY` is set in Vercel env vars (user confirmed it's already added).

**Step 2: Run a test discovery report**

Trigger a Discovery Lab Pro report and check Vercel logs for:
- `[Instantly] Searching for: ...` — confirms the function is being called
- `[Instantly] SuperSearch result: ...` — shows the raw API response shape
- `[Instantly] Leads fetch result: ...` — shows the enriched lead data

**Step 3: Adapt field mapping if needed**

Based on the actual response shape logged in Step 2, update `mapInstantlyLeadToContact()` in `packages/utils/research.ts` to correctly extract fields.

**Step 4: Verify downstream prompt has contact data**

Check the generated report includes contact intel (title, email, employment history). If `enriched_contact` is null, check logs for why.

---

### Task 6: Clean up Apollo dead code (optional, after verification)

**Files:**
- Modify: `packages/utils/research.ts` (remove `enrichCompanyWithApollo`, `enrichContactWithApollo`, `formatApolloContact`)

**Step 1: Remove Apollo functions**

After confirming Instantly works in production, remove the Apollo functions from `research.ts`:
- `enrichCompanyWithApollo` (lines 563-626)
- `enrichContactWithApollo` (lines 631-679)
- `formatApolloContact` (lines 681-701)

Keep the `ApolloCompanyData` and `ApolloContactData` interfaces — they're used as the shared data shape.

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/utils/research.ts
git commit -m "chore: remove Apollo enrichment functions (replaced by Instantly)"
```
