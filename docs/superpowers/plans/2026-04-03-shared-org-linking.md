# Shared Organization Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify client and non-client company data through the `orgs` table so multiple users from the same company share a single company record, with auto-linking by email domain and manual org search.

**Architecture:** The PATCH endpoint for admin user profiles gets a new org find-or-create flow that extracts email domains, matches or creates orgs, merges existing `client_companies` data, and auto-links coworkers. A new search endpoint enables manual org assignment. The frontend Company card drops the `isClient` branch and always uses org fields.

**Tech Stack:** Next.js App Router, Supabase (server client), TypeScript, React

**Spec:** `docs/superpowers/specs/2026-04-03-shared-org-linking-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/web/app/api/admin/users/[id]/route.ts` | PATCH: org find-or-create, merge, auto-link |
| Create | `apps/web/app/api/admin/orgs/search/route.ts` | GET: search orgs by name |
| Modify | `apps/web/app/admin/users/[id]/page.tsx` | Company card: unified org fields + manual search UI |

---

### Task 1: PATCH API — Org Find-or-Create Flow

**Files:**
- Modify: `apps/web/app/api/admin/users/[id]/route.ts:265-376`

This replaces the existing company update logic in the PATCH handler. The current code has three paths: `enrollment_id` (client_companies), `org_id` (orgs update), `create_org` (new org). The new code replaces all three with a unified org-based flow.

- [ ] **Step 1: Add the public domain list and domain extraction helper at the top of the file (after the `verifyAuth` function, around line 8)**

Add this after the `verifyAuth` function closing brace (after line 8):

```typescript
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'hey.com', 'live.com', 'me.com',
  'mac.com', 'msn.com', 'mail.com', 'zoho.com',
]);

function extractDomain(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}
```

- [ ] **Step 2: Replace the company update block in the PATCH handler**

Replace lines 308-369 (the entire `if (body.company) { ... }` block) with:

```typescript
    // Update company → org-based flow
    if (body.company) {
      const { enrollment_id, org_id: manualOrgId, create_org, ...companyFields } = body.company;

      // Get the current user to check org_id and email
      const { data: currentUser } = await (supabase as any)
        .from('users')
        .select('org_id, email')
        .eq('id', id)
        .single();

      const userEmail = currentUser?.email || '';
      const domain = extractDomain(userEmail);
      const isPublicDomain = domain ? PUBLIC_EMAIL_DOMAINS.has(domain) : true;

      let targetOrgId: string | null = manualOrgId || currentUser?.org_id || null;

      // If manually linking to a specific org
      if (manualOrgId) {
        targetOrgId = manualOrgId;
      }
      // If user already has an org, update it
      else if (currentUser?.org_id) {
        targetOrgId = currentUser.org_id;
      }
      // Try to find org by domain
      else if (domain && !isPublicDomain) {
        const { data: domainOrg } = await (supabase as any)
          .from('orgs')
          .select('id')
          .eq('primary_domain', domain)
          .single();

        if (domainOrg) {
          targetOrgId = domainOrg.id;
        }
      }

      // Create org if we still don't have one
      if (!targetOrgId) {
        const orgInsert: Record<string, any> = {
          name: companyFields.name || companyFields.company_name || 'New Company',
          created_by_user_id: id,
          personal: isPublicDomain,
          mode: 'solo',
        };
        if (domain && !isPublicDomain) {
          orgInsert.primary_domain = domain;
        }
        // Map client_companies field names to org field names on create
        if (companyFields.website || companyFields.url) orgInsert.website = companyFields.website || companyFields.url;
        if (companyFields.target_industry || companyFields.industry_niche) orgInsert.target_industry = companyFields.target_industry || companyFields.industry_niche;
        if (companyFields.company_size || companyFields.team_size) orgInsert.company_size = companyFields.company_size || companyFields.team_size;
        if (companyFields.company_revenue || companyFields.revenue_range) orgInsert.company_revenue = companyFields.company_revenue || companyFields.revenue_range;

        const { data: newOrg, error: orgCreateErr } = await (supabase as any)
          .from('orgs')
          .insert(orgInsert)
          .select('id')
          .single();

        if (orgCreateErr) {
          console.error('[Admin Users] Create org error:', orgCreateErr);
        } else {
          targetOrgId = newOrg.id;
        }
      } else {
        // Update existing org fields
        const orgUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
        // Accept both org-native and client_companies-style field names
        if (companyFields.name !== undefined || companyFields.company_name !== undefined) {
          orgUpdate.name = companyFields.name ?? companyFields.company_name;
        }
        if (companyFields.website !== undefined || companyFields.url !== undefined) {
          orgUpdate.website = companyFields.website ?? companyFields.url;
        }
        if (companyFields.target_industry !== undefined || companyFields.industry_niche !== undefined) {
          orgUpdate.target_industry = companyFields.target_industry ?? companyFields.industry_niche;
        }
        if (companyFields.company_size !== undefined || companyFields.team_size !== undefined) {
          orgUpdate.company_size = companyFields.company_size ?? companyFields.team_size;
        }
        if (companyFields.company_revenue !== undefined || companyFields.revenue_range !== undefined) {
          orgUpdate.company_revenue = companyFields.company_revenue ?? companyFields.revenue_range;
        }

        if (Object.keys(orgUpdate).length > 1) { // more than just updated_at
          const { error: orgUpdateErr } = await (supabase as any)
            .from('orgs')
            .update(orgUpdate)
            .eq('id', targetOrgId);
          if (orgUpdateErr) console.error('[Admin Users] Update org error:', orgUpdateErr);
        }
      }

      // Link user to org if not already linked
      if (targetOrgId && currentUser?.org_id !== targetOrgId) {
        await (supabase as any)
          .from('users')
          .update({ org_id: targetOrgId, updated_at: new Date().toISOString() })
          .eq('id', id);

        // Merge client_companies data into org (first link only)
        // Find enrollment and its company data
        const { data: enrollments } = await (supabase as any)
          .from('client_enrollments')
          .select('id')
          .eq('user_id', id);

        if (enrollments?.length > 0) {
          const enrollmentIds = enrollments.map((e: any) => e.id);
          const { data: clientCompany } = await (supabase as any)
            .from('client_companies')
            .select('company_name, url, industry_niche, team_size, revenue_range')
            .in('enrollment_id', enrollmentIds)
            .limit(1)
            .single();

          if (clientCompany) {
            // Merge non-empty client_companies fields into org where org fields are null
            const { data: currentOrg } = await (supabase as any)
              .from('orgs')
              .select('name, website, target_industry, company_size, company_revenue')
              .eq('id', targetOrgId)
              .single();

            if (currentOrg) {
              const mergeUpdate: Record<string, any> = {};
              if (!currentOrg.name && clientCompany.company_name) mergeUpdate.name = clientCompany.company_name;
              if (!currentOrg.website && clientCompany.url) mergeUpdate.website = clientCompany.url;
              if (!currentOrg.target_industry && clientCompany.industry_niche) mergeUpdate.target_industry = clientCompany.industry_niche;
              if (!currentOrg.company_size && clientCompany.team_size) mergeUpdate.company_size = clientCompany.team_size;
              if (!currentOrg.company_revenue && clientCompany.revenue_range) mergeUpdate.company_revenue = clientCompany.revenue_range;

              if (Object.keys(mergeUpdate).length > 0) {
                mergeUpdate.updated_at = new Date().toISOString();
                await (supabase as any)
                  .from('orgs')
                  .update(mergeUpdate)
                  .eq('id', targetOrgId);
              }
            }
          }
        }
      }

      // Auto-link coworkers with same email domain (only for non-public domains)
      if (targetOrgId && domain && !isPublicDomain) {
        const domainPattern = `%@${domain}`;
        await (supabase as any)
          .from('users')
          .update({ org_id: targetOrgId, updated_at: new Date().toISOString() })
          .like('email', domainPattern)
          .is('org_id', null)
          .neq('id', id);
      }
    }
```

- [ ] **Step 3: Verify the PATCH handler compiles**

Run: `cd /Users/timkilroy/Projects/wtf-os && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

Expected: No errors related to the route file. (Other pre-existing errors may appear.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/users/[id]/route.ts
git commit -m "feat: unified org find-or-create flow for company updates

Replaces separate client_companies/org/create_org paths with a single
org-based flow that auto-links users by email domain and merges
existing client_companies data on first link."
```

---

### Task 2: Org Search API Endpoint

**Files:**
- Create: `apps/web/app/api/admin/orgs/search/route.ts`

- [ ] **Step 1: Create the search endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) {
    return NextResponse.json({ orgs: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data: orgs } = await (supabase as any)
    .from('orgs')
    .select('id, name, website, primary_domain')
    .ilike('name', `%${q}%`)
    .limit(10);

  return NextResponse.json({ orgs: orgs || [] });
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/timkilroy/Projects/wtf-os && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | grep "orgs/search"`

Expected: No errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/admin/orgs/search/route.ts
git commit -m "feat: add org search endpoint for manual org linking"
```

---

### Task 3: Frontend — Unified Company Card

**Files:**
- Modify: `apps/web/app/admin/users/[id]/page.tsx:251-377` (saveField, saveCompanySelect functions)
- Modify: `apps/web/app/admin/users/[id]/page.tsx:589-659` (Company card JSX)

This task replaces the `isClient` branching in the Company card with a unified org-based view, and updates the save functions to always use org field paths.

- [ ] **Step 1: Simplify `saveField` — replace the company field mappings (lines 265-295)**

Replace the block from `else if (field === 'company.company_name')` through `else if (field === 'new_org.name')` (lines 265-295) with:

```typescript
    else if (field === 'org.name') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, name: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, name: trimmed || null } };
      }
    } else if (field === 'org.website') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, website: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, website: trimmed || null } };
      }
    } else if (field === 'org.target_industry') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, target_industry: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, target_industry: trimmed || null } };
      }
    } else if (field === 'org.company_size') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, company_size: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, company_size: trimmed || null } };
      }
    }
```

- [ ] **Step 2: Simplify the local state update block (lines 317-340)**

Replace the block from `} else if (field.startsWith('company.') && prev.enrollments[0]) {` through `}` before `return updated;` (lines 317-340) with:

```typescript
      } else if (field.startsWith('org.') && prev.org) {
        const subField = field.replace('org.', '') as keyof OrgData;
        return { ...prev, org: { ...prev.org, [subField]: trimmed || null } };
      } else if (field.startsWith('org.') && !prev.org) {
        // Org was just created — reload to get the full org data
        loadProfile(apiKey);
        return prev;
      }
```

- [ ] **Step 3: Simplify `saveCompanySelect` (lines 354-377)**

Replace the entire `saveCompanySelect` function with:

```typescript
  async function saveCompanySelect(field: string, value: string) {
    if (!profile) return;
    let patchBody: Record<string, unknown> = {};
    if (field === 'org.company_revenue') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, company_revenue: value || null } };
      } else {
        patchBody = { company: { create_org: true, company_revenue: value || null } };
      }
    }
    const ok = await patchUser(patchBody);
    if (!ok) return;
    setProfile((prev) => {
      if (!prev) return prev;
      if (prev.org) {
        return { ...prev, org: { ...prev.org, company_revenue: value || null } };
      }
      // Org was just created — reload
      loadProfile(apiKey);
      return prev;
    });
  }
```

- [ ] **Step 4: Replace the Company card JSX (lines 589-659)**

Replace the entire Company card `<div>` (from `{/* Company Card */}` through the closing `</div>` before `{/* Same-Company Users */}`) with:

```tsx
            {/* Company Card */}
            <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded mt-4">
              <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Company</h3>

              <FieldRow label="Name">
                <EditableField field="org.name" value={org?.name ?? null} />
              </FieldRow>
              <FieldRow label="Website">
                <EditableField field="org.website" value={org?.website ?? null} />
              </FieldRow>
              <FieldRow label="Industry">
                <EditableField field="org.target_industry" value={org?.target_industry ?? null} />
              </FieldRow>
              <FieldRow label="Size">
                <EditableField field="org.company_size" value={org?.company_size ?? null} />
              </FieldRow>
              <FieldRow label="Revenue">
                <select
                  value={org?.company_revenue || ''}
                  onChange={(e) => saveCompanySelect('org.company_revenue', e.target.value)}
                  className="bg-black border border-[#333] text-[#999] text-xs px-2 py-0.5 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                >
                  <option value="">—</option>
                  {REVENUE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FieldRow>
            </div>
```

- [ ] **Step 5: Verify the page compiles**

Run: `cd /Users/timkilroy/Projects/wtf-os && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | grep "admin/users"`

Expected: No errors related to this file.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/users/[id]/page.tsx
git commit -m "feat: unified company card — always uses org fields for all user types

Removes isClient branching in the Company card. All users (client and
non-client) now edit shared org data. Drops HQ and Founded fields."
```

---

### Task 4: Frontend — Manual Org Search UI

**Files:**
- Modify: `apps/web/app/admin/users/[id]/page.tsx`

Adds an inline org search below the Company card header so admins can manually link a user to an existing org.

- [ ] **Step 1: Add org search state to the component (after the `editDraft` useState, around line 189)**

Add after `const [editDraft, setEditDraft] = useState('');`:

```typescript
  const [orgSearchOpen, setOrgSearchOpen] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Array<{ id: string; name: string; website: string | null; primary_domain: string | null }>>([]);
```

- [ ] **Step 2: Add the org search handler (after `saveCompanySelect`, before the `EditableField` component)**

```typescript
  async function searchOrgs(query: string) {
    setOrgSearchQuery(query);
    if (query.length < 2) { setOrgSearchResults([]); return; }
    try {
      const res = await fetch(`/api/admin/orgs/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrgSearchResults(data.orgs || []);
      }
    } catch { setOrgSearchResults([]); }
  }

  async function linkToOrg(orgId: string) {
    const ok = await patchUser({ company: { org_id: orgId } });
    if (!ok) return;
    setOrgSearchOpen(false);
    setOrgSearchQuery('');
    setOrgSearchResults([]);
    loadProfile(apiKey);
  }
```

- [ ] **Step 3: Add the search UI inside the Company card, right after the `<h3>Company</h3>` heading**

Replace:
```tsx
              <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Company</h3>
```

With:
```tsx
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-anton text-sm uppercase text-[#FFDE59]">Company</h3>
                <button
                  onClick={() => setOrgSearchOpen(!orgSearchOpen)}
                  className="text-[9px] uppercase font-bold text-[#666] hover:text-[#00D4FF] transition-colors"
                >
                  {orgSearchOpen ? 'Cancel' : 'Link to org...'}
                </button>
              </div>

              {orgSearchOpen && (
                <div className="mb-3">
                  <input
                    autoFocus
                    value={orgSearchQuery}
                    onChange={(e) => searchOrgs(e.target.value)}
                    placeholder="Search orgs by name..."
                    className="bg-black border border-[#00D4FF] text-white px-2 py-1 text-xs focus:outline-none w-full mb-1"
                  />
                  {orgSearchResults.length > 0 && (
                    <div className="border border-[#333] bg-[#111] max-h-32 overflow-y-auto">
                      {orgSearchResults.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => linkToOrg(o.id)}
                          className="block w-full text-left px-2 py-1.5 text-xs text-[#999] hover:text-white hover:bg-[#222] transition-colors border-b border-[#222] last:border-0"
                        >
                          {o.name}
                          {o.primary_domain && (
                            <span className="text-[#666] ml-2">@{o.primary_domain}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {orgSearchQuery.length >= 2 && orgSearchResults.length === 0 && (
                    <p className="text-[#666] text-[10px] px-1">No orgs found</p>
                  )}
                </div>
              )}
```

- [ ] **Step 4: Verify the page compiles**

Run: `cd /Users/timkilroy/Projects/wtf-os && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | grep "admin/users"`

Expected: No errors related to this file.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/users/[id]/page.tsx
git commit -m "feat: add manual org search/link UI to admin user profiles

Adds 'Link to org...' button on the Company card that opens an inline
search. Selecting a result links the user to that org and reloads."
```

---

### Task 5: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/timkilroy/Projects/wtf-os && npm run dev` (or however the dev server starts)

- [ ] **Step 2: Test the happy path — client with no org**

1. Go to `/admin/users/<luis-user-id>` (Luis at social-imprint.com)
2. In the Company card, click the Name field and type "Social Imprint"
3. Verify: org is created, Name shows "Social Imprint"
4. Fill in Website, Industry, Size, Revenue
5. Go to `/admin/users/<leticia-user-id>` (Leticia at social-imprint.com)
6. Verify: Company card shows the same "Social Imprint" data (auto-linked by domain)
7. Verify: "Same Company" section shows Luis

- [ ] **Step 3: Test manual org linking**

1. Go to a user with a gmail.com address (if any)
2. Click "Link to org..."
3. Search for "Social Imprint" (or "InteractOne")
4. Select it
5. Verify: Company card shows that org's data

- [ ] **Step 4: Test editing shared org data**

1. On Leticia's profile, change the Website field
2. Go to Luis's profile
3. Verify: the Website change is reflected

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: smoke test fixes for org linking"
```
