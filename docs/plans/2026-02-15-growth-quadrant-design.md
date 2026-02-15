# Growth Quadrant: Cross-App Archetype System

**Date:** 2026-02-15
**Status:** Approved

## Problem

The Visibility Lab has a standalone archetype system (10 archetypes like "The Order Taker") that:
- Has no progression or ranking — all archetypes are equally negative diagnoses
- Is disconnected from every other lab (Call Lab, Discovery Lab, WTF Assessment)
- Is classified by AI based on a Google search, leading to inaccurate results
- Doesn't exist anywhere else in the app

## Solution: The Growth Quadrant

Replace the standalone archetypes with a **data-driven quadrant system** that maps users into four positions based on actual lab scores. Archetypes are positions users move between as they improve — not permanent labels.

## The Four Archetypes

```
              HIGH POSITIONING
              (Visible, known, clear brand)
                     |
       +-------------+-------------+
       |             |             |
       |  THE        |  THE        |
       |  MEGAPHONE  |  MACHINE    |
       |             |             |
       |             |             |
LOW ---+-------------+-------------+--- HIGH
EXEC   |             |             |    EXECUTION
       |  THE        |  THE HIDDEN |
       |  SLEEPER    |  GEM        |
       |             |             |
       |             |             |
       +-------------+-------------+
                     |
              LOW POSITIONING
```

| Archetype | Emoji | One-liner | Improvement Path |
|-----------|-------|-----------|-----------------|
| The Sleeper | (sleeping) | "The talent is there. The world doesn't know yet." | -> Hidden Gem (Call Lab) or -> Megaphone (Visibility Lab) |
| The Hidden Gem | (gem) | "You convert when they find you. They just can't find you." | -> Machine (Visibility Lab + WTF Assessment) |
| The Megaphone | (megaphone) | "Everyone knows your name. Your pipeline says otherwise." | -> Machine (Call Lab + Discovery Lab) |
| The Machine | (gear) | "You're findable, credible, and you close. Now scale it." | Maintain + optimize |

## Score Mapping

### Execution Axis (0-100)

| Lab | Weight | Data Points |
|-----|--------|-------------|
| Call Lab | 60% | overall_score (from call_lab_reports), trust velocity, agenda control |
| Discovery Lab | 40% | Brief completeness, version (pro vs lite), number of briefs |

### Positioning Axis (0-100)

| Lab | Weight | Data Points |
|-----|--------|-------------|
| Visibility Lab | 60% | visibilityScore, VVV clarity score |
| WTF Assessment | 40% | Overall score, category scores |

### Quadrant Thresholds

- Each axis splits at 50
- **Sleeper:** Execution < 50, Positioning < 50
- **Hidden Gem:** Execution >= 50, Positioning < 50
- **Megaphone:** Execution < 50, Positioning >= 50
- **Machine:** Execution >= 50, Positioning >= 50

### Handling Partial Data

- Users won't have all labs completed on day one
- If only one axis has data: show that score, other axis shows "?" with CTA to run the relevant lab
- Minimum 1 lab from each axis required to place on the quadrant
- Progressive reveal: the more labs you use, the more accurate your placement

## Deliverables

### 1. Archetype Computation Library
**File:** `apps/web/lib/growth-quadrant.ts`

Shared function that:
- Takes a userId
- Queries latest scores from call_lab_reports, discovery_briefs, visibility lab data, and assessment scores
- Computes execution score (weighted avg of Call Lab + Discovery Lab)
- Computes positioning score (weighted avg of Visibility Lab + WTF Assessment)
- Returns: `{ executionScore, positioningScore, archetype, completeness }`

### 2. Archetype Explainer Page
**Route:** `/growth-quadrant`

Standalone page that:
- Visually explains the quadrant system with the chart
- Describes each archetype with one-liner, characteristics, and improvement paths
- Shows which labs feed each axis
- Links to each lab
- Linkable from reports, dashboard, emails, and share cards

### 3. Dashboard Archetype Card
New card on the dashboard showing:
- Visual quadrant chart with user's dot plotted
- Current archetype name + one-liner
- Progress arrows: which direction to move + which lab to use next
- If incomplete: "Complete [Lab Name] to unlock your full profile"

### 4. Visibility Lab: Loops Event
**New function:** `onVisibilityReportGenerated()` in `apps/web/lib/loops.ts`

Follow the same pattern as `onReportGenerated()` and `onDiscoveryReportGenerated()`:
- Fire event with: email, reportUrl, visibilityScore, archetype, brandName
- Report needs to be saved to a database table (or localStorage-based URL) for linkability

### 5. Visibility Lab: Replace Old Archetypes
- Remove the 10 standalone archetypes from `apps/web/lib/visibility-lab/archetypes.ts`
- Update the Perplexity prompt to remove archetype classification
- Update `Dashboard.tsx` to show the quadrant placement instead of the old archetype badge
- The Visibility Lab still runs its full analysis (VVV audit, leaks, competitors, etc.) — only the archetype display changes

### 6. Visibility Lab: Share UX
Replace current share buttons with:
- Shareable card: "I'm a Hidden Gem on the TriOS Growth Quadrant" with visual chart
- Link to the explainer page
- LinkedIn share with pre-filled message referencing the archetype
- Download as image option

### 7. Update Existing Loops Events
Add archetype variables to existing event calls:
- `onReportGenerated()` (Call Lab) — add `archetype`, `executionScore`, `positioningScore`
- `onDiscoveryReportGenerated()` (Discovery Lab) — add same variables
- `onAssessmentCompleted()` (WTF Assessment) — add same variables

### 8. Update Existing Loops Calls
In each lab's API route, compute the current archetype and pass it when firing the Loops event:
- `/api/analyze/call/route.ts`
- `/api/analyze/discovery/route.ts`
- `/api/growthos/route.ts`
- `/api/visibility-lab/analyze/route.ts` (new)

## Data Dependencies

### Tables needed for computation:
- `call_lab_reports` — Call Lab scores (already exists)
- `discovery_briefs` — Discovery Lab data (already exists)
- `call_scores` — Legacy call data (already exists)
- Assessment scores table — WTF Assessment data (verify table name)
- Visibility Lab data — currently NOT saved to database (stored in localStorage only). **Must create a table or save mechanism.**

### Key consideration: Visibility Lab persistence
Currently, Visibility Lab reports are only stored in `localStorage` on the client. To include in the quadrant computation and enable emailable report links, we need to either:
- Save reports to a new `visibility_lab_reports` table
- Or generate a shareable URL with the report data

## Architecture Notes

- The archetype computation function must be usable both server-side (for API routes/Loops events) and client-side (for dashboard rendering)
- Computation should be fast — just a few DB queries and math
- Cache the archetype on the user record or compute on-the-fly (recommend compute on-the-fly since it's cheap and always current)
