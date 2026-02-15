# Growth Quadrant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the standalone Visibility Lab archetype system with a data-driven Growth Quadrant that computes user placement from actual lab scores across Call Lab, Discovery Lab, Visibility Lab, and WTF Assessment.

**Architecture:** Server-side computation library queries four database tables, returns weighted axis scores + archetype. New Supabase table for Visibility Lab persistence. Loops event functions updated with archetype variables. New explainer page and dashboard card render the quadrant.

**Tech Stack:** Next.js App Router, Supabase (Postgres), Loops.so API, Recharts, Tailwind CSS, TypeScript

**Design Doc:** `docs/plans/2026-02-15-growth-quadrant-design.md`

---

## Phase 1: Data Foundation

### Task 1: Create `visibility_lab_reports` Supabase Table

The Visibility Lab currently stores reports only in `localStorage`. We need a database table so the Growth Quadrant can query visibility scores server-side and so reports can be linked from emails.

**Step 1: Create the migration**

Run via Supabase MCP `apply_migration` or SQL editor (project ID: `sthtvkcdahgsltwukirl`):

```sql
CREATE TABLE IF NOT EXISTS visibility_lab_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  visibility_score INTEGER NOT NULL,
  vvv_clarity_score INTEGER,
  brand_archetype_name TEXT,
  brand_archetype_reasoning TEXT,
  full_report JSONB NOT NULL,
  input_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Growth Quadrant queries (latest report per user)
CREATE INDEX idx_visibility_lab_reports_user_id ON visibility_lab_reports(user_id, created_at DESC);
-- Index for email-based lookups (non-authenticated users)
CREATE INDEX idx_visibility_lab_reports_email ON visibility_lab_reports(email, created_at DESC);
-- RLS disabled for now (matches other tables like call_lab_reports)
ALTER TABLE visibility_lab_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own reports" ON visibility_lab_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON visibility_lab_reports FOR ALL USING (true);
```

**Step 2: Verify table exists**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'visibility_lab_reports' ORDER BY ordinal_position;
```

**Step 3: Commit**
```bash
git add docs/plans/2026-02-15-growth-quadrant-implementation.md
git commit -m "feat: add growth quadrant implementation plan + visibility_lab_reports table"
```

---

### Task 2: Save Visibility Lab Reports to Database

Currently the Visibility Lab API route (`/api/visibility-lab/analyze`) returns JSON directly and the page stores it in localStorage. We need to also save it to the new table.

**Files:**
- Modify: `apps/web/app/api/visibility-lab/analyze/route.ts`
- Modify: `apps/web/app/api/visibility-lab-pro/analyze/route.ts`

**Step 1: Update the standard Visibility Lab route to save reports**

In `apps/web/app/api/visibility-lab/analyze/route.ts`, after successfully parsing the report JSON (line ~155), add DB save logic before returning:

```typescript
// After: const report = JSON.parse(cleanedText) as AnalysisReport;
// Add: Save to database

import { getSupabaseServerClient } from '@/lib/supabase-service';

// Inside the try block after parsing:
try {
  const supabase = getSupabaseServerClient();
  const { data: savedReport, error: saveError } = await supabase
    .from('visibility_lab_reports')
    .insert({
      email: input.userEmail,
      brand_name: report.brandName,
      visibility_score: report.visibilityScore,
      vvv_clarity_score: report.vvvAudit?.clarityScore || null,
      brand_archetype_name: report.brandArchetype?.name || null,
      brand_archetype_reasoning: report.brandArchetype?.reasoning || null,
      full_report: report,
      input_data: input,
    })
    .select('id')
    .single();

  if (saveError) {
    console.error('Failed to save visibility report:', saveError);
  }

  // Return report with the saved ID so the client can build a report URL
  return NextResponse.json({ ...report, reportId: savedReport?.id || null });
} catch (saveErr) {
  console.error('DB save error (non-blocking):', saveErr);
  return NextResponse.json(report);
}
```

**Step 2: Apply the same pattern to the Pro route**

In `apps/web/app/api/visibility-lab-pro/analyze/route.ts`, add the same DB save logic after parsing the report. The Pro route uses `VisibilityLabProInput` — check what fields are available and map accordingly (the Pro input likely has an `email` field or similar).

**Step 3: Verify by running a test analysis**

Visit `/visibility-lab`, run an analysis, then verify in Supabase:
```sql
SELECT id, email, brand_name, visibility_score, created_at
FROM visibility_lab_reports ORDER BY created_at DESC LIMIT 5;
```

**Step 4: Commit**
```bash
git add apps/web/app/api/visibility-lab/analyze/route.ts apps/web/app/api/visibility-lab-pro/analyze/route.ts
git commit -m "feat: save visibility lab reports to database"
```

---

## Phase 2: Computation Engine

### Task 3: Create Growth Quadrant Computation Library

This is the core function that computes a user's archetype from their lab data.

**Files:**
- Create: `apps/web/lib/growth-quadrant.ts`

**Step 1: Write the computation library**

```typescript
// apps/web/lib/growth-quadrant.ts

import { SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export type GrowthArchetype = 'The Sleeper' | 'The Hidden Gem' | 'The Megaphone' | 'The Machine';

export interface GrowthQuadrantResult {
  executionScore: number | null;    // 0-100 or null if no data
  positioningScore: number | null;  // 0-100 or null if no data
  archetype: GrowthArchetype | null; // null if insufficient data
  completeness: {
    callLab: boolean;
    discoveryLab: boolean;
    visibilityLab: boolean;
    wtfAssessment: boolean;
  };
  labsCompleted: number;
  labsTotal: 4;
}

export const ARCHETYPES: Record<GrowthArchetype, {
  emoji: string;
  oneLiner: string;
  improvementPath: string;
  improvementLabs: string[];
}> = {
  'The Sleeper': {
    emoji: '😴',
    oneLiner: 'The talent is there. The world doesn\'t know yet.',
    improvementPath: 'Improve execution via Call Lab, or improve positioning via Visibility Lab',
    improvementLabs: ['Call Lab', 'Visibility Lab'],
  },
  'The Hidden Gem': {
    emoji: '💎',
    oneLiner: 'You convert when they find you. They just can\'t find you.',
    improvementPath: 'Improve positioning via Visibility Lab + WTF Assessment',
    improvementLabs: ['Visibility Lab', 'WTF Assessment'],
  },
  'The Megaphone': {
    emoji: '📢',
    oneLiner: 'Everyone knows your name. Your pipeline says otherwise.',
    improvementPath: 'Improve execution via Call Lab + Discovery Lab',
    improvementLabs: ['Call Lab', 'Discovery Lab'],
  },
  'The Machine': {
    emoji: '⚙️',
    oneLiner: 'You\'re findable, credible, and you close. Now scale it.',
    improvementPath: 'Maintain and optimize all labs',
    improvementLabs: [],
  },
};

// --- Computation ---

/**
 * Compute execution score from Call Lab + Discovery Lab data.
 * Call Lab = 60% weight, Discovery Lab = 40% weight.
 */
function computeExecutionScore(
  callLabScore: number | null,
  discoveryLabScore: number | null
): number | null {
  if (callLabScore === null && discoveryLabScore === null) return null;

  // If only one axis has data, use it as the full score
  if (callLabScore !== null && discoveryLabScore === null) return callLabScore;
  if (discoveryLabScore !== null && callLabScore === null) return discoveryLabScore;

  return Math.round(callLabScore! * 0.6 + discoveryLabScore! * 0.4);
}

/**
 * Compute positioning score from Visibility Lab + WTF Assessment data.
 * Visibility Lab = 60% weight, WTF Assessment = 40% weight.
 */
function computePositioningScore(
  visibilityScore: number | null,
  assessmentScore: number | null
): number | null {
  if (visibilityScore === null && assessmentScore === null) return null;

  if (visibilityScore !== null && assessmentScore === null) return visibilityScore;
  if (assessmentScore !== null && visibilityScore === null) return assessmentScore;

  return Math.round(visibilityScore! * 0.6 + assessmentScore! * 0.4);
}

/**
 * Determine archetype from axis scores.
 */
function determineArchetype(
  executionScore: number | null,
  positioningScore: number | null
): GrowthArchetype | null {
  if (executionScore === null || positioningScore === null) return null;

  if (executionScore >= 50 && positioningScore >= 50) return 'The Machine';
  if (executionScore >= 50 && positioningScore < 50) return 'The Hidden Gem';
  if (executionScore < 50 && positioningScore >= 50) return 'The Megaphone';
  return 'The Sleeper';
}

/**
 * Compute a normalized Discovery Lab score (0-100).
 * Based on: number of briefs, whether pro version used, brief completeness.
 */
function computeDiscoveryLabScore(briefs: Array<{
  version?: string;
  full_report?: Record<string, unknown>;
}>): number | null {
  if (!briefs || briefs.length === 0) return null;

  let score = 0;

  // Base: having at least 1 brief = 30 points
  score += 30;

  // Volume bonus: up to 20 points for multiple briefs (cap at 5)
  score += Math.min(briefs.length, 5) * 4;

  // Pro usage bonus: 25 points if any pro brief exists
  const hasPro = briefs.some(b => b.version === 'pro');
  if (hasPro) score += 25;

  // Completeness bonus: up to 25 points based on report data richness
  const latestBrief = briefs[0];
  if (latestBrief?.full_report) {
    const report = latestBrief.full_report;
    const fields = ['executive_summary', 'company_overview', 'discovery_questions', 'talking_points'];
    const filledFields = fields.filter(f => report[f]).length;
    score += Math.round((filledFields / fields.length) * 25);
  }

  return Math.min(score, 100);
}

/**
 * Main computation function.
 * Queries all lab tables and computes the Growth Quadrant placement.
 */
export async function computeGrowthQuadrant(
  supabase: SupabaseClient,
  userId: string
): Promise<GrowthQuadrantResult> {
  // Query all lab data in parallel
  const [callLabResult, discoveryResult, visibilityResult, assessmentResult] = await Promise.all([
    // Call Lab: latest report's overall_score
    supabase
      .from('call_lab_reports')
      .select('full_report')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // Discovery Lab: all briefs for scoring
    supabase
      .from('discovery_briefs')
      .select('version, full_report')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Visibility Lab: latest report's visibility_score + clarity_score
    supabase
      .from('visibility_lab_reports')
      .select('visibility_score, vvv_clarity_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // WTF Assessment: latest assessment's overall_score
    supabase
      .from('assessments')
      .select('overall_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  // Extract scores
  const callLabScore = callLabResult.data?.full_report?.meta?.overall_score ?? null;
  const discoveryBriefs = discoveryResult.data || [];
  const discoveryLabScore = computeDiscoveryLabScore(discoveryBriefs);

  // Visibility: weighted blend of visibilityScore (0-100) and clarityScore (0-10, scaled to 0-100)
  let visibilityScore: number | null = null;
  if (visibilityResult.data) {
    const vs = visibilityResult.data.visibility_score;
    const cs = visibilityResult.data.vvv_clarity_score;
    if (vs !== null && cs !== null) {
      visibilityScore = Math.round(vs * 0.7 + (cs * 10) * 0.3);
    } else if (vs !== null) {
      visibilityScore = vs;
    }
  }

  const assessmentScore = assessmentResult.data?.overall_score ?? null;

  // Compute axes
  const executionScore = computeExecutionScore(callLabScore, discoveryLabScore);
  const positioningScore = computePositioningScore(visibilityScore, assessmentScore);

  // Determine archetype
  const archetype = determineArchetype(executionScore, positioningScore);

  const completeness = {
    callLab: callLabResult.data !== null,
    discoveryLab: discoveryBriefs.length > 0,
    visibilityLab: visibilityResult.data !== null,
    wtfAssessment: assessmentResult.data !== null,
  };

  const labsCompleted = Object.values(completeness).filter(Boolean).length;

  return {
    executionScore,
    positioningScore,
    archetype,
    completeness,
    labsCompleted,
    labsTotal: 4,
  };
}

/**
 * Lightweight version for API routes that already have a Supabase client.
 * Returns just the archetype info needed for Loops events.
 */
export async function getArchetypeForLoops(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  archetype: string;
  executionScore: number;
  positioningScore: number;
}> {
  const result = await computeGrowthQuadrant(supabase, userId);
  return {
    archetype: result.archetype || 'Incomplete',
    executionScore: result.executionScore ?? 0,
    positioningScore: result.positioningScore ?? 0,
  };
}
```

**Step 2: Commit**
```bash
git add apps/web/lib/growth-quadrant.ts
git commit -m "feat: add Growth Quadrant computation library"
```

---

## Phase 3: Loops Integration

### Task 4: Add Visibility Lab Loops Event + Update Existing Events

**Files:**
- Modify: `apps/web/lib/loops.ts`

**Step 1: Add `onVisibilityReportGenerated()` function**

Add after the existing `onAssessmentCompleted()` function (around line 366):

```typescript
/**
 * Fire when a Visibility Lab report is generated
 * Sends transactional email with link to the report
 */
export async function onVisibilityReportGenerated(
  email: string,
  reportId: string,
  visibilityScore: number,
  brandName: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/visibility-lab/report/${reportId}`;

  return sendEvent({
    email,
    eventName: 'visibility_report_generated',
    eventProperties: {
      reportId,
      reportUrl,
      visibilityScore,
      brandName,
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}
```

**Step 2: Update `onReportGenerated()` signature to accept archetype variables**

Change the function signature (line ~250) to add optional archetype params:

```typescript
export async function onReportGenerated(
  email: string,
  reportId: string,
  reportType: 'lite' | 'pro' = 'lite',
  prospectName?: string,
  companyName?: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/call-lab/report/${reportId}`;

  return sendEvent({
    email,
    eventName: 'report_generated',
    eventProperties: {
      reportId,
      reportUrl,
      reportType,
      prospectName: prospectName || '',
      companyName: companyName || '',
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}
```

**Step 3: Update `onDiscoveryReportGenerated()` signature**

Add the same optional archetype params (line ~277):

```typescript
export async function onDiscoveryReportGenerated(
  email: string,
  reportType: 'lite' | 'pro' = 'lite',
  targetCompany: string,
  targetContact?: string,
  targetContactTitle?: string,
  reportId?: string,
  reportUrl?: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  // ... existing code ...
  return sendEvent({
    email,
    eventName: 'discovery_report_generated',
    eventProperties: {
      reportType: reportTypeLabel,
      targetCompany,
      targetContact: targetContact || '',
      targetContactTitle: targetContactTitle || '',
      reportId: reportId || '',
      reportUrl: reportUrl || '',
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}
```

**Step 4: Update `onAssessmentCompleted()` signature**

Add the same optional archetype params (line ~335):

```typescript
export async function onAssessmentCompleted(
  email: string,
  firstName: string,
  agencyName: string,
  assessmentId: string,
  overallScore: number,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  // ... existing createOrUpdateContact code unchanged ...

  return sendEvent({
    email,
    eventName: 'assessment_completed',
    eventProperties: {
      firstName: firstName || '',
      agencyName: agencyName || '',
      assessmentId,
      overallScore,
      resultsUrl,
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}
```

**Step 5: Commit**
```bash
git add apps/web/lib/loops.ts
git commit -m "feat: add visibility lab Loops event, add archetype vars to all events"
```

---

### Task 5: Update API Routes to Compute + Pass Archetype

Each API route needs to compute the current archetype and pass it to the Loops event.

**Files:**
- Modify: `apps/web/app/api/analyze/call/route.ts`
- Modify: `apps/web/app/api/analyze/discovery/route.ts`
- Modify: `apps/web/app/api/growthos/route.ts`
- Modify: `apps/web/app/api/visibility-lab/analyze/route.ts`

#### Step 1: Update Call Lab route

In `apps/web/app/api/analyze/call/route.ts`, update the `sendReportEmail` helper function (line ~35):

```typescript
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

async function sendReportEmail(
  supabase: any,
  userId: string | null | undefined,
  reportId: string,
  reportType: 'lite' | 'pro',
  prospectName?: string,
  companyName?: string
) {
  if (!userId) return;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (user?.email) {
      // Compute current archetype
      const quadrant = await getArchetypeForLoops(supabase, userId);

      await onReportGenerated(
        user.email,
        reportId,
        reportType,
        prospectName,
        companyName,
        quadrant.archetype,
        quadrant.executionScore,
        quadrant.positioningScore
      ).catch(err => {
        console.error('Failed to send Loops report email:', err);
      });

      // ... rest of existing code (Beehiiv, etc.)
    }
  } catch (error) {
    console.error('sendReportEmail error:', error);
  }
}
```

#### Step 2: Update Discovery Lab route

In `apps/web/app/api/analyze/discovery/route.ts`, around line 354 where `onDiscoveryReportGenerated` is called:

```typescript
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

// Before the Loops call, compute archetype:
let quadrant = { archetype: '', executionScore: 0, positioningScore: 0 };
try {
  // userId should be available from the auth context in this route
  if (userId) {
    quadrant = await getArchetypeForLoops(supabase, userId);
  }
} catch (err) {
  console.error('Failed to compute archetype:', err);
}

// Then pass to both pro and lite event calls:
const loopsResult = await onDiscoveryReportGenerated(
  requestor_email,
  version as 'lite' | 'pro',
  target_company,
  target_contact_name,
  target_contact_title,
  reportId,
  reportUrl,
  quadrant.archetype,
  quadrant.executionScore,
  quadrant.positioningScore
);
```

#### Step 3: Update WTF Assessment route

In `apps/web/app/api/growthos/route.ts`, around line 297:

```typescript
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

// Before the Loops call, compute archetype:
let quadrant = { archetype: '', executionScore: 0, positioningScore: 0 };
try {
  // Note: WTF Assessment may not have a userId (it uses email-based identification)
  // Check if there's a user_id from the assessment save
  if (userId) {
    quadrant = await getArchetypeForLoops(supabaseAdmin, userId);
  }
} catch (err) {
  console.error('Failed to compute archetype:', err);
}

onAssessmentCompleted(
  intakeData.email,
  nameParts[0] || '',
  intakeData.agencyName,
  assessmentId,
  scores.overall,
  quadrant.archetype,
  quadrant.executionScore,
  quadrant.positioningScore
).catch((err) => {
  console.error('[GrowthOS] Loops assessment email trigger failed:', err);
});
```

#### Step 4: Update Visibility Lab route to fire Loops event

In `apps/web/app/api/visibility-lab/analyze/route.ts`, after saving the report to DB (from Task 2):

```typescript
import { onVisibilityReportGenerated } from '@/lib/loops';
import { getArchetypeForLoops } from '@/lib/growth-quadrant';

// After saving to DB and getting savedReport.id:
if (savedReport?.id) {
  // Try to compute archetype (may not have userId for non-authenticated users)
  let archetype = '';
  let executionScore = 0;
  let positioningScore = 0;

  // Fire Loops event (fire-and-forget)
  onVisibilityReportGenerated(
    input.userEmail,
    savedReport.id,
    report.visibilityScore,
    report.brandName,
    archetype,
    executionScore,
    positioningScore
  ).catch(err => {
    console.error('Failed to send Visibility Lab Loops event:', err);
  });
}
```

**Note:** The Visibility Lab page currently doesn't require authentication. Users provide their email in the form. If they're not authenticated, we can't look up a userId for the archetype computation. For non-authenticated users, the archetype fields will be empty. This is acceptable for now.

#### Step 5: Commit
```bash
git add apps/web/app/api/analyze/call/route.ts apps/web/app/api/analyze/discovery/route.ts apps/web/app/api/growthos/route.ts apps/web/app/api/visibility-lab/analyze/route.ts
git commit -m "feat: compute and pass archetype to all Loops events"
```

---

## Phase 4: Remove Old Archetypes

### Task 6: Remove Old Archetype System from Visibility Lab

**Files:**
- Modify: `apps/web/app/api/visibility-lab/analyze/route.ts` (remove archetype from prompt)
- Modify: `apps/web/lib/visibility-lab/archetypes.ts` (delete or mark deprecated)
- Modify: `apps/web/lib/visibility-lab/types.ts` (keep `brandArchetype` field for backward compat)

**Step 1: Update the Perplexity prompt to remove archetype classification**

In `apps/web/app/api/visibility-lab/analyze/route.ts`, remove lines that reference archetypes:

1. Remove the import: `import { DEMAND_OS_ARCHETYPES } from '@/lib/visibility-lab/archetypes';`
2. Remove line ~17: `const archetypeList = DEMAND_OS_ARCHETYPES.map(...)`
3. In the system prompt, remove section 3 ("Brand Archetype (CRITICAL)") that asks the AI to classify into one of 10 archetypes
4. Keep the `brandArchetype` field in the JSON output but change the prompt instruction to: `"brandArchetype": { "name": "string (AI's brief characterization)", "reasoning": "string" }` — This lets the AI still provide a quick characterization, but it's no longer the definitive archetype. The Growth Quadrant handles that now.

**Step 2: Deprecate the archetypes file**

In `apps/web/lib/visibility-lab/archetypes.ts`, add a deprecation comment:

```typescript
/**
 * @deprecated These standalone archetypes have been replaced by the Growth Quadrant system.
 * See apps/web/lib/growth-quadrant.ts for the new data-driven archetype computation.
 * Keeping this file temporarily for backward compatibility with existing reports.
 */
export const DEMAND_OS_ARCHETYPES = [
  // ... keep existing content for now (existing reports reference these names)
];
```

**Step 3: Commit**
```bash
git add apps/web/app/api/visibility-lab/analyze/route.ts apps/web/lib/visibility-lab/archetypes.ts
git commit -m "feat: remove old archetype classification from Visibility Lab prompt"
```

---

### Task 7: Update Visibility Lab Dashboard to Show Growth Quadrant

**Files:**
- Modify: `apps/web/components/visibility-lab/Dashboard.tsx`

**Step 1: Replace archetype badge with Growth Quadrant reference**

In `Dashboard.tsx`, the archetype is displayed at lines 174-176:

```tsx
<div className="text-brand-yellow font-anton text-2xl uppercase mb-2 leading-none">{data.brandArchetype.name}</div>
<div className="text-[10px] text-gray-300 border-t border-gray-700 pt-2 italic">&quot;{data.brandArchetype.reasoning}&quot;</div>
```

Replace with a link to the Growth Quadrant explainer:

```tsx
<div className="mt-6 text-center w-full">
  {/* If we have a Growth Quadrant archetype from the response, show it */}
  {data.brandArchetype?.name && (
    <>
      <div className="text-brand-yellow font-anton text-xl uppercase mb-1 leading-none">
        AI Assessment: {data.brandArchetype.name}
      </div>
      <div className="text-[10px] text-gray-400 italic mb-3">
        &quot;{data.brandArchetype.reasoning}&quot;
      </div>
    </>
  )}
  <a
    href="/growth-quadrant"
    className="inline-block text-xs text-brand-red hover:text-brand-yellow transition-colors uppercase font-bold tracking-wider border border-brand-red/30 px-3 py-1 hover:border-brand-yellow/50"
  >
    View Your Growth Quadrant Placement &rarr;
  </a>
</div>
```

**Step 2: Commit**
```bash
git add apps/web/components/visibility-lab/Dashboard.tsx
git commit -m "feat: update Visibility Lab dashboard to link to Growth Quadrant"
```

---

## Phase 5: Growth Quadrant UI

### Task 8: Create Growth Quadrant Explainer Page

**Files:**
- Create: `apps/web/app/growth-quadrant/page.tsx`

This is a standalone, publicly accessible page that explains the quadrant system. It should be linkable from reports, dashboard, emails, and share cards.

**Step 1: Create the page**

```typescript
// apps/web/app/growth-quadrant/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { ARCHETYPES, GrowthArchetype } from '@/lib/growth-quadrant';

export const metadata: Metadata = {
  title: 'Growth Quadrant | TriOS',
  description: 'Discover your agency growth archetype based on real lab data. Are you a Sleeper, Hidden Gem, Megaphone, or Machine?',
};

const QUADRANT_DATA: Array<{
  archetype: GrowthArchetype;
  position: string;
  execution: string;
  positioning: string;
  color: string;
  bgColor: string;
  borderColor: string;
  labLinks: Array<{ name: string; href: string }>;
}> = [
  {
    archetype: 'The Sleeper',
    position: 'bottom-left',
    execution: 'Low',
    positioning: 'Low',
    color: 'text-gray-400',
    bgColor: 'bg-gray-900',
    borderColor: 'border-gray-600',
    labLinks: [
      { name: 'Call Lab', href: '/call-lab' },
      { name: 'Visibility Lab', href: '/visibility-lab' },
    ],
  },
  {
    archetype: 'The Hidden Gem',
    position: 'bottom-right',
    execution: 'High',
    positioning: 'Low',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-600',
    labLinks: [
      { name: 'Visibility Lab', href: '/visibility-lab' },
      { name: 'WTF Assessment', href: '/growthos/assessment' },
    ],
  },
  {
    archetype: 'The Megaphone',
    position: 'top-left',
    execution: 'Low',
    positioning: 'High',
    color: 'text-brand-yellow',
    bgColor: 'bg-yellow-950/30',
    borderColor: 'border-brand-yellow',
    labLinks: [
      { name: 'Call Lab', href: '/call-lab' },
      { name: 'Discovery Lab', href: '/discovery-lab' },
    ],
  },
  {
    archetype: 'The Machine',
    position: 'top-right',
    execution: 'High',
    positioning: 'High',
    color: 'text-brand-red',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-brand-red',
    labLinks: [],
  },
];

export default function GrowthQuadrantPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="text-brand-red text-xs font-mono uppercase tracking-widest mb-4">
            TriOS Growth Framework
          </div>
          <h1 className="text-5xl md:text-6xl font-anton uppercase mb-6">
            The Growth <span className="text-brand-red">Quadrant</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-poppins">
            Your position isn&apos;t a label. It&apos;s a starting point.
            The more labs you run, the more accurate your placement — and the clearer your next move.
          </p>
        </div>

        {/* Visual Quadrant Chart */}
        <div className="max-w-lg mx-auto mb-20">
          <div className="relative">
            {/* Axis labels */}
            <div className="text-center mb-2 text-xs text-gray-500 uppercase tracking-widest font-mono">
              High Positioning
            </div>
            <div className="grid grid-cols-2 gap-1 border border-gray-700">
              {/* Top-left: Megaphone */}
              <div className="bg-yellow-950/20 border border-brand-yellow/20 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">📢</div>
                <div className="font-anton text-brand-yellow uppercase text-sm">The Megaphone</div>
              </div>
              {/* Top-right: Machine */}
              <div className="bg-red-950/20 border border-brand-red/20 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">⚙️</div>
                <div className="font-anton text-brand-red uppercase text-sm">The Machine</div>
              </div>
              {/* Bottom-left: Sleeper */}
              <div className="bg-gray-900 border border-gray-700 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">😴</div>
                <div className="font-anton text-gray-400 uppercase text-sm">The Sleeper</div>
              </div>
              {/* Bottom-right: Hidden Gem */}
              <div className="bg-blue-950/20 border border-blue-600/20 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">💎</div>
                <div className="font-anton text-blue-400 uppercase text-sm">The Hidden Gem</div>
              </div>
            </div>
            <div className="text-center mt-2 text-xs text-gray-500 uppercase tracking-widest font-mono">
              Low Positioning
            </div>
            {/* Side labels */}
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90 text-xs text-gray-500 uppercase tracking-widest font-mono whitespace-nowrap pr-4">
              Low Execution
            </div>
            <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 rotate-90 text-xs text-gray-500 uppercase tracking-widest font-mono whitespace-nowrap pl-4">
              High Execution
            </div>
          </div>
        </div>

        {/* Axis Explainers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-[#1a1a1a] border border-gray-800 p-8">
            <h3 className="font-anton text-2xl text-brand-yellow uppercase mb-4">
              Execution Axis
            </h3>
            <p className="text-gray-400 mb-4 font-poppins">
              Can you close? Are your sales calls effective? Do you prepare thoroughly for discovery?
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">60%</span>
                <Link href="/call-lab" className="text-white hover:text-brand-yellow transition-colors">
                  Call Lab &rarr;
                </Link>
                <span className="text-gray-500">Overall call score, trust velocity, agenda control</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">40%</span>
                <Link href="/discovery-lab" className="text-white hover:text-brand-yellow transition-colors">
                  Discovery Lab &rarr;
                </Link>
                <span className="text-gray-500">Brief completeness, version, volume</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-gray-800 p-8">
            <h3 className="font-anton text-2xl text-brand-yellow uppercase mb-4">
              Positioning Axis
            </h3>
            <p className="text-gray-400 mb-4 font-poppins">
              Can they find you? When they do, is your brand clear, credible, and differentiated?
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">60%</span>
                <Link href="/visibility-lab" className="text-white hover:text-brand-yellow transition-colors">
                  Visibility Lab &rarr;
                </Link>
                <span className="text-gray-500">Visibility score, VVV clarity</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">40%</span>
                <Link href="/growthos/assessment" className="text-white hover:text-brand-yellow transition-colors">
                  WTF Assessment &rarr;
                </Link>
                <span className="text-gray-500">Overall score, category scores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Archetype Detail Cards */}
        <h2 className="text-4xl font-anton uppercase text-center mb-12">
          The Four <span className="text-brand-red">Archetypes</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {QUADRANT_DATA.map((q) => {
            const info = ARCHETYPES[q.archetype];
            return (
              <div
                key={q.archetype}
                className={`${q.bgColor} border ${q.borderColor} p-8`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{info.emoji}</span>
                  <div>
                    <h3 className={`font-anton text-2xl uppercase ${q.color}`}>
                      {q.archetype}
                    </h3>
                    <div className="text-xs text-gray-500 font-mono">
                      Execution: {q.execution} / Positioning: {q.positioning}
                    </div>
                  </div>
                </div>
                <p className="text-white text-lg italic mb-4 font-poppins">
                  &quot;{info.oneLiner}&quot;
                </p>
                <div className="border-t border-gray-700 pt-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-2">
                    How to level up
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{info.improvementPath}</p>
                  {q.labLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.labLinks.map((lab) => (
                        <Link
                          key={lab.href}
                          href={lab.href}
                          className="text-xs bg-black border border-gray-700 px-3 py-1 text-white hover:border-brand-red hover:text-brand-red transition-colors uppercase font-bold"
                        >
                          {lab.name} &rarr;
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center border-t border-gray-800 pt-12">
          <h2 className="text-3xl font-anton uppercase mb-4">
            Ready to find your <span className="text-brand-yellow">position</span>?
          </h2>
          <p className="text-gray-400 mb-8 font-poppins">
            Run any lab to start building your Growth Quadrant profile.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/call-lab"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              Call Lab
            </Link>
            <Link
              href="/discovery-lab"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              Discovery Lab
            </Link>
            <Link
              href="/visibility-lab"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              Visibility Lab
            </Link>
            <Link
              href="/growthos/assessment"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              WTF Assessment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify page renders**

Visit `/growth-quadrant` in browser. Verify:
- All four archetypes display correctly
- Lab links work
- Page is responsive

**Step 3: Commit**
```bash
git add apps/web/app/growth-quadrant/page.tsx
git commit -m "feat: add Growth Quadrant explainer page"
```

---

### Task 9: Create Dashboard Archetype Card Component

**Files:**
- Create: `apps/web/components/dashboard/GrowthQuadrantCard.tsx`
- Modify: `apps/web/app/dashboard/page.tsx` (add the card)

**Step 1: Create the card component**

This is a server component that takes pre-fetched quadrant data and renders the visual card.

```typescript
// apps/web/components/dashboard/GrowthQuadrantCard.tsx
import Link from 'next/link';
import { GrowthQuadrantResult, ARCHETYPES } from '@/lib/growth-quadrant';

interface Props {
  quadrant: GrowthQuadrantResult;
}

export function GrowthQuadrantCard({ quadrant }: Props) {
  const { executionScore, positioningScore, archetype, completeness, labsCompleted } = quadrant;

  // Compute dot position as percentages (for the visual quadrant)
  const dotX = executionScore !== null ? Math.max(5, Math.min(95, executionScore)) : 50;
  const dotY = positioningScore !== null ? Math.max(5, Math.min(95, 100 - positioningScore)) : 50;

  const archetypeInfo = archetype ? ARCHETYPES[archetype] : null;

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-anton text-xl text-white uppercase">Growth Quadrant</h3>
        <Link
          href="/growth-quadrant"
          className="text-xs text-gray-500 hover:text-brand-yellow transition-colors uppercase"
        >
          Learn more &rarr;
        </Link>
      </div>

      {archetype && archetypeInfo ? (
        <>
          {/* Quadrant mini-chart */}
          <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-4">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-gray-700">
              <div className="bg-yellow-950/20" /> {/* Megaphone: top-left */}
              <div className="bg-red-950/20" />    {/* Machine: top-right */}
              <div className="bg-gray-900" />       {/* Sleeper: bottom-left */}
              <div className="bg-blue-950/20" />    {/* Hidden Gem: bottom-right */}
            </div>
            {/* User dot */}
            {executionScore !== null && positioningScore !== null && (
              <div
                className="absolute w-4 h-4 bg-brand-red rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${dotX}%`, top: `${dotY}%` }}
              />
            )}
          </div>

          {/* Archetype info */}
          <div className="text-center mb-4">
            <div className="text-2xl mb-1">{archetypeInfo.emoji}</div>
            <div className="font-anton text-brand-yellow text-lg uppercase">{archetype}</div>
            <div className="text-xs text-gray-400 italic mt-1">&quot;{archetypeInfo.oneLiner}&quot;</div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Execution</div>
              <div className="font-anton text-2xl text-white">{executionScore ?? '?'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Positioning</div>
              <div className="font-anton text-2xl text-white">{positioningScore ?? '?'}</div>
            </div>
          </div>

          {/* Improvement hint */}
          {archetype !== 'The Machine' && archetypeInfo.improvementLabs.length > 0 && (
            <div className="border-t border-gray-800 pt-3 text-center">
              <div className="text-xs text-gray-500 mb-2">Level up with:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {archetypeInfo.improvementLabs.map((lab) => {
                  const labHref =
                    lab === 'Call Lab' ? '/call-lab' :
                    lab === 'Discovery Lab' ? '/discovery-lab' :
                    lab === 'Visibility Lab' ? '/visibility-lab' :
                    '/growthos/assessment';
                  return (
                    <Link
                      key={lab}
                      href={labHref}
                      className="text-xs bg-black border border-gray-700 px-2 py-1 text-brand-red hover:border-brand-red transition-colors uppercase font-bold"
                    >
                      {lab}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Incomplete state */
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔒</div>
          <div className="font-anton text-lg text-gray-400 uppercase mb-2">
            {labsCompleted}/4 Labs Complete
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Complete at least one Execution lab and one Positioning lab to unlock your placement.
          </p>
          <div className="space-y-2">
            {!completeness.callLab && (
              <Link href="/call-lab" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Run Call Lab (Execution) &rarr;
              </Link>
            )}
            {!completeness.discoveryLab && (
              <Link href="/discovery-lab" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Run Discovery Lab (Execution) &rarr;
              </Link>
            )}
            {!completeness.visibilityLab && (
              <Link href="/visibility-lab" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Run Visibility Lab (Positioning) &rarr;
              </Link>
            )}
            {!completeness.wtfAssessment && (
              <Link href="/growthos/assessment" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Take WTF Assessment (Positioning) &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add the card to the dashboard page**

In `apps/web/app/dashboard/page.tsx`:

1. Import the component and the computation function:
```typescript
import { GrowthQuadrantCard } from '@/components/dashboard/GrowthQuadrantCard';
import { computeGrowthQuadrant } from '@/lib/growth-quadrant';
```

2. In the `getDashboardData` function (or where the page fetches data), add a call to compute the quadrant:
```typescript
const quadrant = await computeGrowthQuadrant(supabase, user.id);
```

3. Add the `<GrowthQuadrantCard quadrant={quadrant} />` in the dashboard layout where it makes sense — likely near the top of the page alongside the key metrics.

**Step 3: Export from dashboard barrel file**

Check if `apps/web/components/dashboard/index.ts` exists and add the export:
```typescript
export { GrowthQuadrantCard } from './GrowthQuadrantCard';
```

**Step 4: Verify dashboard renders**

Log in, visit `/dashboard`, verify:
- Card shows with correct data or "locked" state
- Links to labs work
- Quadrant dot renders in correct position

**Step 5: Commit**
```bash
git add apps/web/components/dashboard/GrowthQuadrantCard.tsx apps/web/app/dashboard/page.tsx
git commit -m "feat: add Growth Quadrant card to dashboard"
```

---

## Phase 6: Share UX

### Task 10: Update Visibility Lab Share Experience

**Files:**
- Modify: `apps/web/components/visibility-lab/Dashboard.tsx`

**Step 1: Update the share function**

Replace the `handleShare` function (line ~36) with Growth Quadrant messaging:

```typescript
const handleShare = () => {
  const explainerUrl = `${window.location.origin}/growth-quadrant`;
  const text = `Just ran my Visibility Lab on TriOS.\n\nVisibility Score: ${data.visibilityScore}/100\n\nDiscover your agency growth archetype at ${explainerUrl}\n\nThanks @timkilroy!`;
  const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  window.open(linkedInUrl, '_blank');
};
```

**Step 2: Commit**
```bash
git add apps/web/components/visibility-lab/Dashboard.tsx
git commit -m "feat: update Visibility Lab share to reference Growth Quadrant"
```

---

## Phase 7: Verification

### Task 11: End-to-End Verification

**Step 1: Verify Supabase table**
```sql
SELECT * FROM visibility_lab_reports LIMIT 1;
```

**Step 2: Verify Growth Quadrant computation**

Run a Visibility Lab analysis, then check:
```sql
SELECT id, email, brand_name, visibility_score, created_at
FROM visibility_lab_reports ORDER BY created_at DESC LIMIT 3;
```

**Step 3: Verify Growth Quadrant explainer page**
- Visit `/growth-quadrant`
- Check all four archetypes render
- Check all lab links work

**Step 4: Verify Dashboard card**
- Visit `/dashboard`
- Check Growth Quadrant card renders
- If labs are incomplete, check CTA links

**Step 5: Verify Loops events fire**
- Check server logs for Loops event calls
- Verify archetype variables are included

**Step 6: Final commit and deploy**
```bash
git add -A
git commit -m "feat: Growth Quadrant system - complete implementation"
git push origin main
```

---

## Summary of All Files Changed

| Action | File |
|--------|------|
| **Create** | `apps/web/lib/growth-quadrant.ts` |
| **Create** | `apps/web/app/growth-quadrant/page.tsx` |
| **Create** | `apps/web/components/dashboard/GrowthQuadrantCard.tsx` |
| **Modify** | `apps/web/lib/loops.ts` |
| **Modify** | `apps/web/app/api/visibility-lab/analyze/route.ts` |
| **Modify** | `apps/web/app/api/visibility-lab-pro/analyze/route.ts` |
| **Modify** | `apps/web/app/api/analyze/call/route.ts` |
| **Modify** | `apps/web/app/api/analyze/discovery/route.ts` |
| **Modify** | `apps/web/app/api/growthos/route.ts` |
| **Modify** | `apps/web/components/visibility-lab/Dashboard.tsx` |
| **Modify** | `apps/web/lib/visibility-lab/archetypes.ts` |
| **Modify** | `apps/web/app/dashboard/page.tsx` |
| **DB Migration** | `visibility_lab_reports` table |
