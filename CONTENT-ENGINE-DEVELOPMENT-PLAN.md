# DemandOS Content Engine - Development Plan

## Overview

This plan transforms the DemandOS Content Engine PRD into actionable development phases. It leverages the existing monorepo architecture (Next.js 14, Supabase, Claude API, Tailwind + Radix UI) while introducing new domain-specific functionality.

**Design Direction:** Based on the interface concepts, I recommend the **Warm/Premium design** for the primary content hub experience (light, approachable, serif accents) with the **Dashboard/Dark design** for the call extraction interface (professional, data-dense). This creates visual differentiation between "creative" and "analytical" modes.

---

## Phase 1: Foundation (Auth + Profiles + Org Structure)

### 1.1 Database Schema Extensions

**New Tables:**

```sql
-- Organizations (content engine specific, separate from existing agencies)
CREATE TABLE content_orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_status TEXT DEFAULT 'trial', -- trial, active, past_due, cancelled
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org membership (with roles)
CREATE TABLE content_org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'brand_official', 'creator', 'distributor')),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Extended user profiles for content engine
CREATE TABLE content_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  title TEXT,
  department TEXT,
  platforms TEXT[] DEFAULT '{}', -- linkedin, twitter, email
  comfort_level TEXT DEFAULT 'distributor' CHECK (comfort_level IN ('distributor', 'creator')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice profiles (the core innovation)
CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  examples TEXT[] DEFAULT '{}', -- 3-5 content samples
  description TEXT, -- "How would you describe your voice?"
  extracted_dna JSONB, -- AI-extracted patterns
  is_locked BOOLEAN DEFAULT FALSE, -- true for Brand Official
  calibration_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE content_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'distributor',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tasks:**
- [ ] Create migration file: `packages/db/migrations/001_content_engine_foundation.sql`
- [ ] Add RLS policies for all new tables (org membership-based access)
- [ ] Generate TypeScript types: `packages/db/types/content-engine.ts`
- [ ] Create query functions: `packages/db/queries/content-orgs.ts`

### 1.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/content-engine/orgs` | POST | Create organization |
| `/api/content-engine/orgs/[slug]` | GET | Get org details |
| `/api/content-engine/orgs/[slug]/members` | GET/POST | List/add members |
| `/api/content-engine/orgs/[slug]/invite` | POST | Send invitation |
| `/api/content-engine/invites/[token]` | GET/POST | View/accept invite |
| `/api/content-engine/profile` | GET/PUT | User profile CRUD |
| `/api/content-engine/voice` | GET/PUT | Voice profile CRUD |
| `/api/content-engine/voice/calibrate` | POST | Run voice extraction AI |

**Tasks:**
- [ ] Scaffold API route structure under `apps/web/app/api/content-engine/`
- [ ] Implement org creation with owner assignment
- [ ] Implement invitation flow with email via Resend
- [ ] Create voice calibration prompt in `packages/prompts/content-engine/voice-calibration.ts`

### 1.3 Frontend Pages

| Page | Purpose |
|------|---------|
| `/content-hub` | Landing/dashboard for content engine |
| `/content-hub/onboarding` | Multi-step onboarding wizard |
| `/content-hub/onboarding/org` | Create org (Brand Official) |
| `/content-hub/onboarding/profile` | Basic profile setup |
| `/content-hub/onboarding/voice` | Voice calibration |
| `/content-hub/settings` | Org settings, member management |
| `/content-hub/invite/[token]` | Accept invitation page |

**Tasks:**
- [ ] Create route group `apps/web/app/(content-hub)/`
- [ ] Build `OnboardingWizard` component with step tracking
- [ ] Build `VoiceCalibrationForm` with paste areas for examples
- [ ] Build `TeamSettingsPanel` for member management
- [ ] Build `InviteMemberModal` with email input + role selector

### 1.4 Components

```
apps/web/components/content-hub/
├── OnboardingWizard.tsx
├── VoiceCalibrationForm.tsx
├── ProfileForm.tsx
├── TeamSettingsPanel.tsx
├── InviteMemberModal.tsx
├── MemberCard.tsx
├── RoleBadge.tsx
└── OrgSelector.tsx  (if user belongs to multiple orgs)
```

**Tasks:**
- [ ] Design + implement each component with Tailwind + CVA
- [ ] Use warm/premium color palette from interface concepts
- [ ] Create loading states and error handling

---

## Phase 2: Content Repository

### 2.1 Database Schema

```sql
-- Content sources (the repository)
CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),

  -- Content data
  title TEXT,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('article', 'call', 'meeting', 'podcast', 'original', 'email')),
  raw_content TEXT NOT NULL,
  synopsis TEXT, -- AI-generated 2-3 sentences

  -- Categorization
  theme_4e TEXT CHECK (theme_4e IN ('evidence', 'education', 'entertainment', 'envision')),
  vvv_tags TEXT[] DEFAULT '{}', -- vibes, vision, values

  -- Metadata
  visibility TEXT DEFAULT 'team' CHECK (visibility IN ('draft', 'team')),
  repurpose_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for repository browsing
CREATE INDEX idx_content_sources_org ON content_sources(org_id);
CREATE INDEX idx_content_sources_theme ON content_sources(theme_4e);
CREATE INDEX idx_content_sources_author ON content_sources(author_id);
CREATE INDEX idx_content_sources_created ON content_sources(created_at DESC);

-- Full-text search
CREATE INDEX idx_content_sources_fts ON content_sources
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(raw_content, '') || ' ' || COALESCE(synopsis, '')));
```

**Tasks:**
- [ ] Create migration: `002_content_repository.sql`
- [ ] Add RLS policies for org-scoped access
- [ ] Create query functions with search + filtering

### 2.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/content-engine/sources` | GET | List sources (with filters) |
| `/api/content-engine/sources` | POST | Create source (manual) |
| `/api/content-engine/sources/[id]` | GET/PUT/DELETE | Source CRUD |
| `/api/content-engine/sources/import-url` | POST | Import from URL |
| `/api/content-engine/sources/[id]/synopsis` | POST | Generate synopsis |

**Tasks:**
- [ ] Implement URL content extraction (use existing patterns from Discovery Lab)
- [ ] Create 4E auto-categorization prompt: `packages/prompts/content-engine/categorize.ts`
- [ ] Create synopsis generation prompt
- [ ] Implement full-text search with PostgreSQL

### 2.3 Frontend Pages

| Page | Purpose |
|------|---------|
| `/content-hub/repository` | Browse all content |
| `/content-hub/repository/[id]` | Single source view |
| `/content-hub/create` | Add new content |

**Tasks:**
- [ ] Build `ContentRepository` page with grid/list views
- [ ] Build filter sidebar (4E, source type, author, recency)
- [ ] Build search bar with full-text search
- [ ] Build `ContentCard` component showing title, theme badge, repurpose count
- [ ] Build `AddContentModal` with tabs: Paste, URL, Upload

### 2.4 Components

```
apps/web/components/content-hub/
├── ContentRepository.tsx
├── ContentCard.tsx
├── ContentFilters.tsx
├── ContentSearch.tsx
├── AddContentModal.tsx
├── URLImporter.tsx
├── ThemeBadge.tsx  (4E theme indicator)
└── SourceTypeBadge.tsx
```

---

## Phase 3: Output Engine (Core Feature)

### 3.1 Database Schema

```sql
-- Repurposed content versions
CREATE TABLE repurposes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES content_sources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Output details
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'email', 'pull_quotes')),
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,

  -- Generation metadata
  voice_profile_id UUID REFERENCES voice_profiles(id),
  tone_adjustments TEXT[] DEFAULT '{}', -- spicier, shorter, professional

  visibility TEXT DEFAULT 'draft' CHECK (visibility IN ('draft', 'team')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_repurposes_source ON repurposes(source_id);
CREATE INDEX idx_repurposes_user ON repurposes(user_id);
CREATE INDEX idx_repurposes_platform ON repurposes(platform);
```

**Tasks:**
- [ ] Create migration: `003_repurposes.sql`
- [ ] Add RLS policies

### 3.2 Prompts (Critical Path)

**Location:** `packages/prompts/content-engine/`

```typescript
// repurpose.ts
export const REPURPOSE_SYSTEM_PROMPT = `You are a content repurposing expert...`;

export const LINKEDIN_PROMPT = `Transform this content into a LinkedIn post:
- Hook-heavy opening (pattern interrupt)
- 150-200 words
- Native formatting (line breaks, not bullets)
- End with soft CTA or question
...`;

export const TWITTER_THREAD_PROMPT = `Transform into a Twitter/X thread:
- 5-7 tweets max
- Each tweet must stand alone with value
- Punchy, direct language
- No hashtags (cringe)
...`;

export const EMAIL_TEASER_PROMPT = `Create an email teaser:
- 75 words max
- Intrigue-focused, not summary
- Drives to full content
- No "click here" or spam triggers
...`;

export const PULL_QUOTES_PROMPT = `Extract 3 shareable one-liners:
- Quote-worthy standalone statements
- No more than 15 words each
- Bold, opinionated, memorable
...`;
```

**Tasks:**
- [ ] Write comprehensive repurpose prompts for each platform
- [ ] Include voice DNA injection points in prompts
- [ ] Add tone adjustment modifiers (spicier, shorter, professional)
- [ ] Test extensively with real content samples

### 3.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/content-engine/repurpose` | POST | Generate repurpose |
| `/api/content-engine/repurpose/[id]` | PUT | Regenerate/adjust |
| `/api/content-engine/repurpose/batch` | POST | Generate all platforms at once |
| `/api/content-engine/sources/[id]/repurposes` | GET | Get all repurposes for source |

**Request Shape:**
```typescript
interface RepurposeRequest {
  sourceId: string;
  platforms: ('linkedin' | 'twitter' | 'email' | 'pull_quotes')[];
  voiceProfileId?: string; // Optional, uses user's own if not specified
  toneAdjustments?: ('spicier' | 'shorter' | 'professional')[];
}
```

**Tasks:**
- [ ] Implement repurpose generation with Claude
- [ ] Implement voice DNA injection
- [ ] Implement tone adjustment handling
- [ ] Return all outputs in single response for interactive hub

### 3.4 Frontend Pages

| Page | Purpose |
|------|---------|
| `/content-hub/repository/[id]/repurpose` | Generate repurposes |

**The Interactive Hub (Key UX):**

```
┌─────────────────────────────────────────────────────────────┐
│ Source Content                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ "Your pipeline is a lie..."                             │ │
│ │ Evidence · Brand Official · 12 repurposes               │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [LinkedIn] [Twitter] [Email] [Pull Quotes]                  │ ← Tabs
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Generated content appears here...                          │
│                                                             │
│  [🔥 Spicier] [🎯 Shorter] [👔 Professional]               │ ← Adjusters
│                                                             │
│  [↻ Regenerate]                    [Copy to Clipboard]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Build `RepurposeHub` component with tabbed interface
- [ ] Build `OutputPanel` with content display + adjusters
- [ ] Build `ToneAdjuster` buttons
- [ ] Implement copy-to-clipboard functionality
- [ ] Add version history sidebar ("See others' versions")

### 3.5 Components

```
apps/web/components/content-hub/
├── RepurposeHub.tsx          # Main interactive container
├── RepurposeTabBar.tsx       # Platform tabs
├── OutputPanel.tsx           # Generated content display
├── ToneAdjusterBar.tsx       # Spicier/Shorter/Professional
├── RegenerateButton.tsx
├── CopyToClipboardButton.tsx
├── VersionHistory.tsx        # Show team repurposes
└── VoiceSelector.tsx         # Switch between Brand Official / personal
```

---

## Phase 4: Call Integration (Fireflies)

### 4.1 Database Schema

```sql
-- External call imports
CREATE TABLE call_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- External provider data
  provider TEXT DEFAULT 'fireflies' CHECK (provider IN ('fireflies', 'zoom', 'gong', 'otter', 'fathom', 'google_meet')),
  external_id TEXT NOT NULL, -- Fireflies meeting ID
  external_url TEXT, -- Link to original in Fireflies

  -- Call metadata
  title TEXT,
  participants TEXT[] DEFAULT '{}',
  duration_seconds INTEGER,
  call_date TIMESTAMPTZ,
  call_type TEXT, -- client_call, team_meeting, podcast, sales_call

  -- Content
  transcript TEXT NOT NULL,
  summary TEXT, -- Fireflies AI summary if available

  -- Processing
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_moments JSONB DEFAULT '[]', -- AI-extracted content moments

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, provider, external_id)
);

CREATE INDEX idx_call_imports_org ON call_imports(org_id);
CREATE INDEX idx_call_imports_status ON call_imports(processing_status);
```

**Tasks:**
- [ ] Create migration: `004_call_imports.sql`
- [ ] Add RLS policies

### 4.2 Fireflies Integration

**Integration Approach:**
1. User connects Fireflies account (OAuth or API key)
2. Webhook receives new transcript notifications
3. System pulls transcript + processes for content moments
4. User reviews moments → adds to repository

**API Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/content-engine/integrations/fireflies/connect` | POST | Initiate OAuth/API key |
| `/api/content-engine/integrations/fireflies/webhook` | POST | Receive new transcripts |
| `/api/content-engine/integrations/fireflies/sync` | POST | Manual sync |
| `/api/content-engine/calls` | GET | List imported calls |
| `/api/content-engine/calls/[id]` | GET | Get call with moments |
| `/api/content-engine/calls/[id]/extract` | POST | Re-run moment extraction |
| `/api/content-engine/calls/[id]/moments/[momentId]/promote` | POST | Add moment to repository |

**Tasks:**
- [ ] Research Fireflies API documentation
- [ ] Implement API key storage (encrypted in Supabase)
- [ ] Build webhook handler for new transcripts
- [ ] Create manual sync flow for initial import

### 4.3 Content Moment Detection

**Prompt:** `packages/prompts/content-engine/moment-detection.ts`

```typescript
export const MOMENT_DETECTION_PROMPT = `
Analyze this call transcript and identify content moments.

Content moments are:
- Memorable quotes or one-liners
- Rants (passionate explanations)
- Analogies or metaphors
- Frameworks or mental models explained
- Stories with lessons
- Hot takes or contrarian views
- Specific data points or statistics mentioned

For each moment, provide:
- Timestamp (start time in HH:MM:SS)
- Quote (exact words, 2-4 sentences max)
- Type (quote, rant, analogy, framework, story, hot_take, data_point)
- Confidence score (0-100)
- Suggested 4E category

Output as JSON array.
`;
```

**Tasks:**
- [ ] Create moment detection prompt with examples
- [ ] Implement confidence scoring
- [ ] Build processing pipeline (async job)

### 4.4 Frontend Pages

| Page | Purpose |
|------|---------|
| `/content-hub/calls` | List imported calls |
| `/content-hub/calls/[id]` | Review call moments |
| `/content-hub/settings/integrations` | Connect Fireflies |

**Call Moments Interface (from dashboard design concept):**

```
┌────────────────────┬────────────────────────────────────────┐
│ RECENT CALLS       │ Acme Corp Call                         │
│                    │ 47 min · 5 content moments detected    │
│ ● Acme Corp        ├────────────────────────────────────────┤
│   Today · 5 moments│ ┌────────────────────────────────────┐ │
│                    │ │ 12:34  "The real problem isn't..." │ │
│ ○ TechStart Inc    │ │ [94% confidence]                   │ │
│   Yesterday · 3    │ │ [Add to Repository] [Repurpose]    │ │
│                    │ └────────────────────────────────────┘ │
│ ○ Growth Partners  │                                        │
│   Jan 3 · 7 moments│ ┌────────────────────────────────────┐ │
│                    │ │ 23:17  "Stop measuring activities" │ │
└────────────────────┴────────────────────────────────────────┘
```

**Tasks:**
- [ ] Build `CallsList` component
- [ ] Build `CallMomentsReview` page with transcript scrubber
- [ ] Build `MomentCard` with promote/dismiss actions
- [ ] Build `FirefliesConnectFlow` component

### 4.5 Components

```
apps/web/components/content-hub/
├── CallsList.tsx
├── CallCard.tsx
├── CallMomentsReview.tsx
├── MomentCard.tsx
├── TranscriptViewer.tsx
├── TimestampBadge.tsx
├── ConfidenceIndicator.tsx
└── integrations/
    └── FirefliesConnect.tsx
```

---

## Phase 5: Engagement (Nudges + Digests)

### 5.1 Database Schema

```sql
-- Notification preferences
CREATE TABLE content_notification_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Notification types
  new_content_alerts BOOLEAN DEFAULT TRUE,
  call_gold_alerts BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT TRUE,

  -- Digest settings
  digest_day TEXT DEFAULT 'monday' CHECK (digest_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log (for tracking what's been sent)
CREATE TABLE content_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL, -- new_content, call_gold, weekly_digest
  reference_id UUID, -- content_source_id or call_import_id

  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);
```

**Tasks:**
- [ ] Create migration: `005_notifications.sql`
- [ ] Add RLS policies

### 5.2 Email Templates

**Using Resend (already configured):**

```
packages/email-templates/content-engine/
├── new-content-alert.tsx       # "Brand Official just published..."
├── call-gold-alert.tsx         # "Your call had 3 content moments..."
├── weekly-digest.tsx           # Summary of week's content
└── invitation.tsx              # Team invite email
```

**Tasks:**
- [ ] Design email templates (React Email)
- [ ] Implement send logic in API routes
- [ ] Set up cron job for weekly digest (Vercel Cron or Supabase pg_cron)

### 5.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/content-engine/notifications/preferences` | GET/PUT | Manage prefs |
| `/api/content-engine/notifications/send-digest` | POST | Trigger digest (cron) |
| `/api/cron/content-digest` | POST | Cron endpoint |

**Tasks:**
- [ ] Implement notification preference management
- [ ] Build weekly digest aggregation query
- [ ] Set up Vercel cron for Monday morning digests

### 5.4 In-App Notifications

**Simple approach for V1:**
- Toast notifications on login when new content available
- Badge indicators on nav items
- No real-time WebSocket (overkill for V1)

**Tasks:**
- [ ] Add notification badge to nav
- [ ] Build "What's New" panel on dashboard
- [ ] Track notification read state

---

## Technical Considerations

### Prompt Engineering Best Practices

Based on existing codebase patterns:

```typescript
// packages/prompts/content-engine/shared.ts

export const VOICE_INJECTION_TEMPLATE = (voiceDna: VoiceDNA) => `
Apply these voice characteristics:
- Sentence length: ${voiceDna.sentenceLength}
- Vocabulary: ${voiceDna.vocabularyLevel}
- Emoji use: ${voiceDna.emojiFrequency}
- Hook style: ${voiceDna.hookStyle}
- Formality: ${voiceDna.formalityLevel}
${voiceDna.profanityTolerance === 'high' ? '- Mild profanity OK when impactful' : '- Keep clean, no profanity'}
`;

export const BRAND_COHERENCE_GUARD = `
While applying personal voice, maintain brand coherence:
- Core message must align with source content
- No contradicting brand positions
- Tone may vary, substance should not
`;
```

### Error Handling

Follow existing patterns:
- Supabase errors → user-friendly messages
- AI failures → retry with backoff
- Validation errors → specific field feedback

### Performance Considerations

1. **Content Repository:** Use PostgreSQL full-text search (already indexed)
2. **AI Calls:** Queue long-running extractions (Fireflies processing)
3. **Repurpose Generation:** Generate all platforms in parallel

### Security Notes

1. **Fireflies API Keys:** Encrypt at rest in Supabase
2. **Call Transcripts:** RLS ensures org-level isolation
3. **Voice Profiles:** Personal data, ensure proper deletion cascade

---

## File Structure Summary

```
apps/web/
├── app/
│   ├── (content-hub)/
│   │   ├── content-hub/
│   │   │   ├── page.tsx                  # Dashboard
│   │   │   ├── repository/
│   │   │   │   ├── page.tsx              # Browse content
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Single source
│   │   │   │       └── repurpose/page.tsx
│   │   │   ├── create/page.tsx           # Add content
│   │   │   ├── calls/
│   │   │   │   ├── page.tsx              # List calls
│   │   │   │   └── [id]/page.tsx         # Review moments
│   │   │   ├── onboarding/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── org/page.tsx
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── voice/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       └── integrations/page.tsx
│   │   └── invite/[token]/page.tsx
│   └── api/content-engine/
│       ├── orgs/
│       ├── profile/
│       ├── voice/
│       ├── sources/
│       ├── repurpose/
│       ├── calls/
│       ├── integrations/
│       └── notifications/
├── components/content-hub/
│   ├── OnboardingWizard.tsx
│   ├── VoiceCalibrationForm.tsx
│   ├── ContentRepository.tsx
│   ├── ContentCard.tsx
│   ├── RepurposeHub.tsx
│   ├── OutputPanel.tsx
│   ├── CallsList.tsx
│   ├── MomentCard.tsx
│   └── ...

packages/
├── db/
│   ├── migrations/
│   │   ├── 001_content_engine_foundation.sql
│   │   ├── 002_content_repository.sql
│   │   ├── 003_repurposes.sql
│   │   ├── 004_call_imports.sql
│   │   └── 005_notifications.sql
│   ├── queries/
│   │   ├── content-orgs.ts
│   │   ├── content-sources.ts
│   │   ├── repurposes.ts
│   │   ├── call-imports.ts
│   │   └── voice-profiles.ts
│   └── types/content-engine.ts
└── prompts/content-engine/
    ├── voice-calibration.ts
    ├── categorize.ts
    ├── repurpose.ts
    ├── moment-detection.ts
    └── shared.ts
```

---

## Decision Points for User

Before starting development, clarify:

1. **Design Direction:** Confirm warm/premium for content hub, dark dashboard for calls?
2. **Billing Integration:** Use existing Stripe setup or new subscription product?
3. **Org Separation:** Content Engine orgs separate from existing agencies, or merge?
4. **Route Prefix:** `/content-hub` or prefer different naming?
5. **MVP Scope:** Start Phase 1-3 only, defer calls to V1.1?

---

## Suggested Sprint Breakdown

**Sprint 1-2: Foundation**
- Database schema + migrations
- Auth integration + org creation
- Basic onboarding flow
- Voice calibration (paste + describe)

**Sprint 3-4: Repository**
- Content CRUD + manual input
- URL import with extraction
- 4E categorization
- Full-text search + filtering

**Sprint 5-7: Output Engine**
- Repurpose prompts (all platforms)
- Voice DNA injection
- Interactive hub UI
- Tone adjusters + regeneration

**Sprint 8-10: Calls**
- Fireflies integration
- Moment detection
- Call review UI
- Promote to repository flow

**Sprint 11-12: Polish + Engagement**
- Email notifications
- Weekly digest
- In-app nudges
- Testing + refinement

---

*Brand Official is the bassline. Everyone else improvises over it.*
