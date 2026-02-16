# Admin Command Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Slack notifications, client file sharing, content library CRUD, and client health dashboard to the admin system.

**Architecture:** Four independent phases, each deploying to production before the next begins. Backend-first: create API routes and lib modules, then build UI on top. All Slack/Loops/Beehiiv calls use fire-and-forget `.catch()` pattern.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Storage + Auth), Slack Incoming Webhooks, Loops.so, Vercel Cron.

**Design doc:** `docs/plans/2026-02-16-admin-command-center-design.md`

---

## Phase 1: Slack Integration

### Task 1: Create Slack notification module

**Files:**
- Create: `apps/web/lib/slack.ts`

**Step 1: Create the module**

```typescript
/**
 * Slack Notification Integration
 *
 * Posts formatted messages to a Slack incoming webhook.
 * Fire-and-forget pattern — never blocks the request.
 */

const SLACK_COLORS = {
  info: '#00D4FF',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#E51B23',
} as const;

type SlackColor = keyof typeof SLACK_COLORS;

interface SlackAlertOptions {
  text: string;
  color?: SlackColor;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  linkUrl?: string;
  linkText?: string;
}

export async function sendSlackAlert(options: SlackAlertOptions): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Slack] Webhook URL not configured, skipping alert');
    return;
  }

  const { text, color = 'info', fields, linkUrl, linkText } = options;

  const attachment: Record<string, any> = {
    color: SLACK_COLORS[color],
    text,
    mrkdwn_in: ['text'],
  };

  if (fields && fields.length > 0) {
    attachment.fields = fields.map(f => ({
      title: f.title,
      value: f.value,
      short: f.short ?? true,
    }));
  }

  if (linkUrl && linkText) {
    attachment.actions = [{
      type: 'button',
      text: linkText,
      url: linkUrl,
    }];
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachments: [attachment] }),
    });

    if (!response.ok) {
      console.error('[Slack] Webhook failed:', response.status, await response.text().catch(() => ''));
    }
  } catch (error) {
    console.error('[Slack] Alert failed:', error);
  }
}

// ── Convenience functions ──────────────────────────────

const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

export function alertFridaySubmitted(clientName: string, companyName: string | null): void {
  sendSlackAlert({
    text: `:memo: *${clientName}*${companyName ? ` (${companyName})` : ''} submitted their Friday check-in`,
    color: 'info',
    linkUrl: `${adminUrl}/admin/five-minute-friday`,
    linkText: 'View in Admin',
  }).catch(err => console.error('[Slack] Friday alert failed:', err));
}

export function alertReportGenerated(
  userName: string,
  product: string,
  targetOrBrand: string
): void {
  const productLabels: Record<string, string> = {
    'discovery-lite': 'Discovery Lab',
    'discovery-pro': 'Discovery Lab Pro',
    'visibility-free': 'Visibility Lab',
    'visibility-pro': 'Visibility Lab Pro',
    'call-lab-lite': 'Call Lab',
    'call-lab-pro': 'Call Lab Pro',
  };
  const label = productLabels[product] || product;

  sendSlackAlert({
    text: `:chart_with_upwards_trend: *${userName}* ran a ${label} report on *${targetOrBrand}*`,
    color: 'info',
  }).catch(err => console.error('[Slack] Report alert failed:', err));
}

export function alertNewSubscription(email: string, product: string, planType: string): void {
  sendSlackAlert({
    text: `:moneybag: New Pro subscription: *${email}* — ${product} (${planType})`,
    color: 'success',
  }).catch(err => console.error('[Slack] Subscription alert failed:', err));
}

export function alertSubscriptionCancelled(email: string): void {
  sendSlackAlert({
    text: `:warning: Subscription cancelled: *${email}*`,
    color: 'danger',
  }).catch(err => console.error('[Slack] Cancellation alert failed:', err));
}

export function alertClientInactive(clientName: string, daysSinceLogin: number): void {
  const emoji = daysSinceLogin >= 14 ? ':red_circle:' : ':large_yellow_circle:';
  sendSlackAlert({
    text: `${emoji} *${clientName}* hasn't logged in for ${daysSinceLogin} days`,
    color: daysSinceLogin >= 14 ? 'danger' : 'warning',
  }).catch(err => console.error('[Slack] Inactivity alert failed:', err));
}

export function alertFridayOverdue(count: number): void {
  if (count === 0) return;
  sendSlackAlert({
    text: `:clock3: ${count} Friday check-in${count > 1 ? 's' : ''} need${count === 1 ? 's' : ''} your response`,
    color: 'warning',
    linkUrl: `${adminUrl}/admin/five-minute-friday`,
    linkText: 'Respond Now',
  }).catch(err => console.error('[Slack] Friday overdue alert failed:', err));
}

export function alertDocumentShared(clientName: string, docTitle: string): void {
  sendSlackAlert({
    text: `:page_facing_up: You shared *${docTitle}* with *${clientName}*`,
    color: 'success',
  }).catch(err => console.error('[Slack] Document alert failed:', err));
}
```

**Step 2: Add `SLACK_WEBHOOK_URL` to `.env.example`**

Append to the Slack section (or create one):

```
# Slack
SLACK_WEBHOOK_URL=
```

**Step 3: Commit**

```bash
git add apps/web/lib/slack.ts apps/web/.env.example
git commit -m "feat: add Slack notification module with convenience helpers"
```

---

### Task 2: Wire Slack alerts into existing routes

**Files:**
- Modify: `apps/web/app/api/client/five-minute-friday/route.ts` (after successful insert)
- Modify: `apps/web/app/api/webhooks/stripe/route.ts` (checkout.session.completed + subscription.deleted)
- Modify: `apps/web/app/api/analyze/discovery/route.ts` (after report saved)
- Modify: `apps/web/app/api/visibility-lab/analyze/route.ts` (after report saved)
- Modify: `apps/web/app/api/visibility-lab-pro/analyze/route.ts` (after report saved)

**Step 1: Five-Minute Friday**

In `apps/web/app/api/client/five-minute-friday/route.ts`:

Add import at top:
```typescript
import { alertFridaySubmitted } from '@/lib/slack';
```

After the successful insert (after `return NextResponse.json({ success: true, id: friday_record.id })`... actually, add it just BEFORE the return):
```typescript
// Slack alert
alertFridaySubmitted(
  enrollment.full_name || enrollment.email || 'Unknown client',
  enrollment.company_name || null
);
```

Note: You'll need to check what fields are available on the enrollment object in this route. The enrollment is already queried — check if `full_name` and `company_name` are selected. If not, add them to the select. Look at the existing select query and add the needed fields.

**Step 2: Stripe webhook**

In `apps/web/app/api/webhooks/stripe/route.ts`:

Add import:
```typescript
import { alertNewSubscription, alertSubscriptionCancelled } from '@/lib/slack';
```

In the `checkout.session.completed` case, after `console.log('Subscription saved successfully')`:
```typescript
// Slack alert
alertNewSubscription(
  session.customer_email || 'unknown',
  product,
  planType
);
```

In the `customer.subscription.deleted` case, after `trackSubscriptionCancelled`:
```typescript
// Slack alert
alertSubscriptionCancelled(cancelledSub?.customer_email || 'unknown');
```

**Step 3: Discovery Lab**

In `apps/web/app/api/analyze/discovery/route.ts`:

Add import:
```typescript
import { alertReportGenerated } from '@/lib/slack';
```

After the report is saved to DB (after `const reportId = insertedReport?.id;`):
```typescript
// Slack alert (only for authenticated users, not anonymous leads)
if (userId) {
  alertReportGenerated(requestor_name, `discovery-${version}`, target_company);
}
```

**Step 4: Visibility Lab (free)**

In `apps/web/app/api/visibility-lab/analyze/route.ts`:

Add import:
```typescript
import { alertReportGenerated } from '@/lib/slack';
```

After `reportId = savedReport?.id || null;`:
```typescript
// Slack alert for authenticated users
if (userId) {
  alertReportGenerated(input.userName, 'visibility-free', input.brandName);
}
```

**Step 5: Visibility Lab Pro**

In `apps/web/app/api/visibility-lab-pro/analyze/route.ts`:

Add import:
```typescript
import { alertReportGenerated } from '@/lib/slack';
```

After `reportId = savedReport?.id || null;`:
```typescript
// Slack alert for authenticated users
if (userId) {
  alertReportGenerated(input.userName, 'visibility-pro', input.brandName);
}
```

**Step 6: Commit**

```bash
git add apps/web/app/api/client/five-minute-friday/route.ts \
  apps/web/app/api/webhooks/stripe/route.ts \
  apps/web/app/api/analyze/discovery/route.ts \
  apps/web/app/api/visibility-lab/analyze/route.ts \
  apps/web/app/api/visibility-lab-pro/analyze/route.ts
git commit -m "feat: wire Slack alerts into Friday, Stripe, and report routes"
```

---

### Task 3: Create daily admin digest cron

**Files:**
- Create: `apps/web/app/api/cron/admin-digest/route.ts`

**Step 1: Create the cron route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { alertClientInactive, alertFridayOverdue } from '@/lib/slack';

export const runtime = 'nodejs';

/**
 * Daily admin digest cron
 *
 * Checks for:
 * 1. Clients inactive for 7+ days
 * 2. Unanswered Friday check-ins
 *
 * Runs daily at 9am ET via Vercel Cron
 */
export async function GET(request: NextRequest) {
  // Verify cron auth (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  try {
    // 1. Find inactive clients (7+ days since last login)
    const { data: enrollments } = await supabase
      .from('client_enrollments')
      .select('user_id, full_name, email, status')
      .eq('status', 'active');

    if (enrollments && enrollments.length > 0) {
      const userIds = enrollments.map((e: any) => e.user_id).filter(Boolean);

      // Get last sign-in from auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers();

      const authUserMap = new Map<string, Date | null>();
      for (const u of authUsers?.users || []) {
        authUserMap.set(u.id, u.last_sign_in_at ? new Date(u.last_sign_in_at) : null);
      }

      const now = new Date();
      for (const enrollment of enrollments) {
        if (!enrollment.user_id) continue;
        const lastLogin = authUserMap.get(enrollment.user_id);
        if (!lastLogin) continue; // Never logged in — invite flow handles this

        const daysSince = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7) {
          alertClientInactive(
            enrollment.full_name || enrollment.email || 'Unknown',
            daysSince
          );
        }
      }
    }

    // 2. Count unanswered Friday check-ins
    const { data: unanswered } = await supabase
      .from('five_minute_fridays')
      .select('id')
      .is('responded_at', null);

    // Alternatively, check for fridays without a response row:
    const { count: unansweredCount } = await supabase
      .from('five_minute_fridays')
      .select('id', { count: 'exact', head: true })
      .not('id', 'in',
        supabase.from('five_minute_friday_responses').select('friday_id')
      );

    // If the subquery approach doesn't work with the Supabase client,
    // use a simpler approach: fetch all fridays and all responses, diff in JS
    const { data: allFridays } = await supabase
      .from('five_minute_fridays')
      .select('id')
      .order('submitted_at', { ascending: false })
      .limit(50);

    const { data: allResponses } = await supabase
      .from('five_minute_friday_responses')
      .select('friday_id');

    const respondedIds = new Set((allResponses || []).map((r: any) => r.friday_id));
    const unansweredFridays = (allFridays || []).filter((f: any) => !respondedIds.has(f.id));

    alertFridayOverdue(unansweredFridays.length);

    return NextResponse.json({
      success: true,
      checked: {
        enrollments: enrollments?.length || 0,
        unansweredFridays: unansweredFridays.length,
      },
    });
  } catch (error) {
    console.error('[Admin Digest] Cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
```

**Important implementation note:** The unanswered Friday query above tries multiple approaches because Supabase JS client doesn't support subqueries well. The implementer should check what columns exist on `five_minute_fridays` and `five_minute_friday_responses` tables. The simplest approach (fetch both, diff in JS) will work for the small data volumes we have. Clean up whichever approach doesn't work.

**Step 2: Commit**

```bash
git add apps/web/app/api/cron/admin-digest/route.ts
git commit -m "feat: add daily admin digest cron for inactivity and overdue Fridays"
```

---

### Task 4: Register cron in vercel.json and add env vars

**Files:**
- Modify: `apps/web/vercel.json`
- Modify: `apps/web/.env.example`

**Step 1: Add cron to vercel.json**

Add to the `crons` array:
```json
{
  "path": "/api/cron/admin-digest",
  "schedule": "0 14 * * *"
}
```

That's 2pm UTC = 9am ET.

**Step 2: Add CRON_SECRET to .env.example**

```
# Vercel Cron
CRON_SECRET=
```

Note: `CRON_SECRET` is automatically set by Vercel for cron jobs. On Vercel, set it in the dashboard. Locally, set any value for testing.

**Step 3: Commit and push**

```bash
git add apps/web/vercel.json apps/web/.env.example
git commit -m "feat: register admin-digest cron in vercel.json"
git push origin main
```

**Step 4: Verify**

After deploy, check Vercel dashboard → Cron Jobs to confirm the new cron is registered. Set `SLACK_WEBHOOK_URL` in Vercel env vars (get this from Slack → Apps → Incoming Webhooks → create new webhook for `#admin-alerts`).

---

## Phase 2: Client File Drop

### Task 5: Create client_documents table

**Files:**
- None (Supabase migration via dashboard or CLI)

**Step 1: Run migration**

Use Supabase MCP or dashboard SQL editor:

```sql
-- Create client_documents table
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  document_type text NOT NULL CHECK (document_type IN ('file', 'link', 'text')),
  file_url text,
  file_name text,
  external_url text,
  content_body text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('roadmap', 'transcript', 'plan', 'resource', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for client portal queries
CREATE INDEX idx_client_documents_enrollment ON client_documents(enrollment_id);

-- RLS policies
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Clients can read their own documents
CREATE POLICY "Clients can view own documents"
  ON client_documents FOR SELECT
  USING (
    enrollment_id IN (
      SELECT id FROM client_enrollments WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything (admin API routes use service role)
CREATE POLICY "Service role full access"
  ON client_documents FOR ALL
  USING (auth.role() = 'service_role');
```

**Step 2: Create storage bucket**

In Supabase dashboard → Storage → New Bucket:
- Name: `client-documents`
- Public: Yes (so file URLs work directly)
- File size limit: 50MB

**Step 3: Commit a note** (no code files changed, but record the migration)

```bash
git commit --allow-empty -m "chore: create client_documents table and storage bucket in Supabase"
```

---

### Task 6: Create admin documents API

**Files:**
- Create: `apps/web/app/api/admin/documents/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { alertDocumentShared } from '@/lib/slack';
import { sendEvent } from '@/lib/loops';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ADMIN_API_KEY;
  return !!(apiKey && authHeader === `Bearer ${apiKey}`);
}

/**
 * GET /api/admin/documents?enrollment_id=xxx
 * List documents for a client enrollment
 */
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enrollmentId = request.nextUrl.searchParams.get('enrollment_id');
  if (!enrollmentId) {
    return NextResponse.json({ error: 'enrollment_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('client_documents')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}

/**
 * POST /api/admin/documents
 * Upload a document for a client (multipart form for files, JSON for links/text)
 */
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  try {
    const contentType = request.headers.get('content-type') || '';
    let enrollmentId: string;
    let title: string;
    let description: string | null = null;
    let documentType: string;
    let category: string = 'other';
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let externalUrl: string | null = null;
    let contentBody: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData();
      enrollmentId = formData.get('enrollment_id') as string;
      title = formData.get('title') as string;
      description = formData.get('description') as string | null;
      documentType = 'file';
      category = (formData.get('category') as string) || 'other';

      const file = formData.get('file') as File | null;
      if (!file || !enrollmentId || !title) {
        return NextResponse.json({ error: 'file, enrollment_id, and title are required' }, { status: 400 });
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'bin';
      const storagePath = `${enrollmentId}/${Date.now()}-${file.name}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Admin Documents] Upload error:', uploadError);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(storagePath);

      fileUrl = urlData.publicUrl;
      fileName = file.name;
    } else {
      // JSON body (link or text)
      const body = await request.json();
      enrollmentId = body.enrollment_id;
      title = body.title;
      description = body.description || null;
      documentType = body.document_type; // 'link' or 'text'
      category = body.category || 'other';
      externalUrl = body.external_url || null;
      contentBody = body.content_body || null;

      if (!enrollmentId || !title || !documentType) {
        return NextResponse.json({ error: 'enrollment_id, title, and document_type are required' }, { status: 400 });
      }
    }

    // Verify enrollment exists and get client info for notifications
    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id, user_id, full_name, email')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Insert document record
    const { data: doc, error: insertError } = await supabase
      .from('client_documents')
      .insert({
        enrollment_id: enrollmentId,
        title,
        description,
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName,
        external_url: externalUrl,
        content_body: contentBody,
        category,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Admin Documents] Insert error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Slack alert
    const clientName = enrollment.full_name || enrollment.email || 'Client';
    alertDocumentShared(clientName, title);

    // Loops event to notify client via email
    if (enrollment.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      sendEvent({
        email: enrollment.email,
        eventName: 'client_document_shared',
        eventProperties: {
          documentTitle: title,
          documentCategory: category,
          portalUrl: `${appUrl}/client/documents`,
        },
      }).catch(err => console.error('[Admin Documents] Loops event failed:', err));
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('[Admin Documents] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/documents
 * Delete a document and its storage file
 */
export async function DELETE(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get document to find storage path
    const { data: doc } = await supabase
      .from('client_documents')
      .select('id, file_url, enrollment_id')
      .eq('id', document_id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage if it's a file
    if (doc.file_url) {
      // Extract path from public URL
      const urlParts = doc.file_url.split('/client-documents/');
      if (urlParts[1]) {
        await supabase.storage
          .from('client-documents')
          .remove([urlParts[1]]);
      }
    }

    // Delete DB record
    const { error } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', document_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Documents] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/app/api/admin/documents/route.ts
git commit -m "feat: add admin documents API (GET/POST/DELETE with file upload)"
```

---

### Task 7: Add Documents panel to admin clients page

**Files:**
- Modify: `apps/web/app/admin/clients/page.tsx`

**Step 1: Expand the roadmap panel to a documents panel**

This is the biggest UI change. Replace the existing roadmap panel with a unified "Documents" panel that supports:
- File upload (any type, not just HTML)
- Link sharing (paste URL)
- Text note
- Category selector (roadmap, transcript, plan, resource, other)
- List of existing documents with view/delete

Key changes to `apps/web/app/admin/clients/page.tsx`:

1. Add new state for documents:
```typescript
const [documents, setDocuments] = useState<Record<string, any[]>>({});
const [loadingDocs, setLoadingDocs] = useState<string | null>(null);
const [uploadingDoc, setUploadingDoc] = useState(false);
const [docTitle, setDocTitle] = useState('');
const [docCategory, setDocCategory] = useState('other');
const [docType, setDocType] = useState<'file' | 'link' | 'text'>('file');
const [docUrl, setDocUrl] = useState('');
const [docText, setDocText] = useState('');
```

2. Add `loadDocuments` function (same pattern as existing `loadRoadmaps` but hits `/api/admin/documents?enrollment_id=`).

3. Add `handleDocUpload` function that:
   - For `file` type: creates FormData with file, enrollment_id, title, category — POSTs to `/api/admin/documents`
   - For `link` type: POSTs JSON with `{ enrollment_id, title, document_type: 'link', external_url, category }`
   - For `text` type: POSTs JSON with `{ enrollment_id, title, document_type: 'text', content_body, category }`

4. Add `handleDeleteDoc` function (same as existing `handleDeleteRoadmap` pattern but hits `/api/admin/documents`).

5. Replace the expandable roadmap panel with a "Documents" panel that has:
   - Three tab buttons: File | Link | Text
   - Upload form that changes based on selected tab
   - Category dropdown: Roadmap, Transcript, Plan, Resource, Other
   - Title input
   - List of existing documents with type badge, category badge, date, View/Delete buttons

Keep the existing "Roadmap" button label in the actions column — just rename it to "Docs".

The existing roadmap feature is NOT removed. Old roadmaps stay accessible at `/client/roadmap`. The Documents panel is a new, better system that lives alongside it.

**Step 2: Commit**

```bash
git add apps/web/app/admin/clients/page.tsx
git commit -m "feat: add Documents panel to admin clients page"
```

---

### Task 8: Create client documents portal page

**Files:**
- Create: `apps/web/app/client/documents/page.tsx`
- Modify: `apps/web/app/client/dashboard/page.tsx` (add Recent Documents card)

**Step 1: Create the documents page**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@repo/db/client';

interface ClientDocument {
  id: string;
  title: string;
  description: string | null;
  document_type: 'file' | 'link' | 'text';
  file_url: string | null;
  file_name: string | null;
  external_url: string | null;
  content_body: string | null;
  category: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  roadmap: 'Roadmap',
  transcript: 'Transcript',
  plan: 'Plan',
  resource: 'Resource',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  roadmap: '#FFDE59',
  transcript: '#00D4FF',
  plan: '#22c55e',
  resource: '#a855f7',
  other: '#666666',
};

export default function ClientDocumentsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [textModal, setTextModal] = useState<ClientDocument | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      // Get enrollment
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!enrollment) { router.push('/client/login'); return; }

      // Get documents
      const { data: docs } = await supabase
        .from('client_documents')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false });

      setDocuments(docs || []);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const filtered = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter);

  const categories = ['all', ...new Set(documents.map(d => d.category))];

  function openDocument(doc: ClientDocument) {
    if (doc.document_type === 'text') {
      setTextModal(doc);
    } else if (doc.document_type === 'link' && doc.external_url) {
      window.open(doc.external_url, '_blank');
    } else if (doc.document_type === 'file' && doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#333333] border-t-[#E51B23] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Your Documents</h1>
          <a href="/client/dashboard" className="text-sm text-[#999999] hover:text-white transition-colors">
            Back to Dashboard
          </a>
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors border ${
                  filter === cat
                    ? 'border-[#E51B23] text-[#E51B23]'
                    : 'border-[#333333] text-[#999999] hover:text-white hover:border-white'
                }`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Documents list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#666666]">No documents yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc)}
                className="bg-[#1A1A1A] border border-[#333333] p-4 hover:border-[#E51B23] transition-colors cursor-pointer flex items-center gap-4"
              >
                {/* Type icon */}
                <div className="w-10 h-10 flex items-center justify-center bg-[#0A0A0A] border border-[#333333] text-[10px] font-bold uppercase text-[#999999]">
                  {doc.document_type === 'file' ? (doc.file_name?.split('.').pop() || 'FILE') : doc.document_type === 'link' ? 'LINK' : 'TXT'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium truncate">{doc.title}</h3>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5"
                      style={{ color: CATEGORY_COLORS[doc.category] || '#666', backgroundColor: `${CATEGORY_COLORS[doc.category] || '#666'}20` }}
                    >
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-[#999999] text-sm mt-0.5 truncate">{doc.description}</p>
                  )}
                  <p className="text-[#666666] text-xs mt-1">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {doc.file_name && <span className="ml-2">{doc.file_name}</span>}
                  </p>
                </div>

                {/* Arrow */}
                <span className="text-[#666666] text-xl">→</span>
              </div>
            ))}
          </div>
        )}

        {/* Text content modal */}
        {textModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setTextModal(null)}>
            <div className="bg-[#1A1A1A] border border-[#333333] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-anton uppercase text-[#E51B23]">{textModal.title}</h2>
                <button onClick={() => setTextModal(null)} className="text-[#999999] hover:text-white text-xl">×</button>
              </div>
              <div className="text-[#CCCCCC] text-sm whitespace-pre-wrap leading-relaxed">
                {textModal.content_body}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add Recent Documents card to client dashboard**

In `apps/web/app/client/dashboard/page.tsx`:

Add a query in the `loadDashboard` useEffect to fetch recent documents:
```typescript
// Check for recent documents
const { data: recentDocs } = await supabase
  .from('client_documents')
  .select('id, title, category, created_at')
  .eq('enrollment_id', enrollment.id)
  .order('created_at', { ascending: false })
  .limit(3);
```

Add `recentDocs` to the state, and render a card on the dashboard:
```tsx
{/* Recent Documents Card */}
{data.recentDocs && data.recentDocs.length > 0 && (
  <a href="/client/documents" className="block bg-[#1A1A1A] border border-[#333333] p-6 hover:border-[#E51B23] transition-colors">
    <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Recent Documents</h3>
    {data.recentDocs.map((doc: any) => (
      <div key={doc.id} className="flex items-center gap-2 text-sm text-[#999999] py-1">
        <span className="text-white">{doc.title}</span>
        <span className="text-[#666666] text-xs">{new Date(doc.created_at).toLocaleDateString()}</span>
      </div>
    ))}
    <p className="text-[#E51B23] text-xs mt-2 uppercase font-bold">View All →</p>
  </a>
)}
```

**Step 3: Commit and push**

```bash
git add apps/web/app/client/documents/page.tsx apps/web/app/client/dashboard/page.tsx
git commit -m "feat: add client documents page and dashboard card"
git push origin main
```

---

## Phase 3: Content Library Admin UI

### Task 9: Add PATCH and DELETE to content API

**Files:**
- Modify: `apps/web/app/api/client/content/route.ts`

**Step 1: Add PATCH handler**

Add after the existing POST handler:

```typescript
/**
 * PATCH /api/client/content
 * Update a content item
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Resolve program slugs to IDs if provided
    if (updates.program_slugs) {
      const { data: programs } = await supabase
        .from('client_programs')
        .select('id')
        .in('slug', updates.program_slugs);
      updates.program_ids = programs?.map((p: any) => p.id) || [];
      delete updates.program_slugs;
    }

    // Handle published_at
    if ('published' in updates) {
      updates.published_at = updates.published ? new Date().toISOString() : null;
    }

    const { data: content, error } = await supabase
      .from('client_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Update failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Add DELETE handler**

```typescript
/**
 * DELETE /api/client/content
 * Delete a content item
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('client_content')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Delete failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Content delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add apps/web/app/api/client/content/route.ts
git commit -m "feat: add PATCH and DELETE handlers to content API"
```

---

### Task 10: Create content library admin page

**Files:**
- Create: `apps/web/app/admin/content/page.tsx`

**Step 1: Create the page**

Build a `'use client'` page at `/admin/content` with:

1. **Auth gate** — same pattern as other admin pages (sessionStorage API key).

2. **Content table** showing all items from `GET /api/client/content`:
   - Title, Type badge (video/deck/pdf/text/link), Published toggle, Programs, Date
   - Sort by `sort_order`

3. **Add/Edit form** (inline panel that appears above the table):
   - Title (text input, required)
   - Description (textarea)
   - Content Type (dropdown: video, deck, pdf, text, link)
   - URL (text input, shown for video/deck/pdf/link types)
   - Body (textarea, shown for text type only)
   - Thumbnail URL (text input, optional)
   - Programs (checkboxes, fetched from `/api/admin/clients` programs list or hardcoded from the PROGRAMS constant)
   - Published toggle
   - Save button → POST for new, PATCH for edit

4. **Delete** — confirm dialog, then DELETE request.

5. **Sort order** — up/down arrow buttons that PATCH the `sort_order` field.

Follow the exact same styling patterns as the existing admin pages (dark theme, `font-anton` headings, red/yellow accent colors, `border-[#333333]` borders).

**Step 2: Commit**

```bash
git add apps/web/app/admin/content/page.tsx
git commit -m "feat: add content library admin page with CRUD"
```

---

## Phase 4: Client Health Dashboard

### Task 11: Create client health API

**Files:**
- Create: `apps/web/app/api/admin/client-health/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ADMIN_API_KEY;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  try {
    // Fetch all active enrollments with program and company info
    const { data: enrollments } = await supabase
      .from('client_enrollments')
      .select(`
        id, user_id, email, full_name, status, enrolled_at,
        program:client_programs(name, slug, has_five_minute_friday),
        company:client_companies(company_name)
      `)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false });

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    // Get auth user data for last_sign_in_at
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authMap = new Map<string, { lastSignIn: string | null }>();
    for (const u of authData?.users || []) {
      authMap.set(u.id, { lastSignIn: u.last_sign_in_at || null });
    }

    // Get report counts per user for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const userIds = enrollments.map((e: any) => e.user_id).filter(Boolean);

    const [callLabResult, discoveryResult, visibilityResult] = await Promise.all([
      supabase
        .from('call_lab_reports')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
      supabase
        .from('discovery_briefs')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
      supabase
        .from('visibility_lab_reports')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
    ]);

    // Count reports per user
    const reportCounts = new Map<string, number>();
    for (const r of [...(callLabResult.data || []), ...(discoveryResult.data || []), ...(visibilityResult.data || [])]) {
      reportCounts.set(r.user_id, (reportCounts.get(r.user_id) || 0) + 1);
    }

    // Get Friday check-in counts per enrollment
    const enrollmentIds = enrollments.map((e: any) => e.id);
    const { data: fridays } = await supabase
      .from('five_minute_fridays')
      .select('enrollment_id, week_of')
      .in('enrollment_id', enrollmentIds);

    const fridayCounts = new Map<string, number>();
    for (const f of fridays || []) {
      fridayCounts.set(f.enrollment_id, (fridayCounts.get(f.enrollment_id) || 0) + 1);
    }

    // Get document counts per enrollment
    const { data: docCounts } = await supabase
      .from('client_documents')
      .select('enrollment_id')
      .in('enrollment_id', enrollmentIds);

    const documentCounts = new Map<string, number>();
    for (const d of docCounts || []) {
      documentCounts.set(d.enrollment_id, (documentCounts.get(d.enrollment_id) || 0) + 1);
    }

    // Build health data
    const clients = enrollments.map((e: any) => {
      const auth = authMap.get(e.user_id);
      const lastSignIn = auth?.lastSignIn || null;
      const reportsThisMonth = reportCounts.get(e.user_id) || 0;
      const fridayCount = fridayCounts.get(e.id) || 0;
      const docCount = documentCounts.get(e.id) || 0;

      // Calculate expected Fridays since enrollment
      const enrolledDate = new Date(e.enrolled_at);
      const weeksSinceEnrollment = Math.max(1, Math.floor((now.getTime() - enrolledDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const hasFriday = (e.program as any)?.has_five_minute_friday || false;
      const expectedFridays = hasFriday ? weeksSinceEnrollment : 0;
      const missedFridays = Math.max(0, expectedFridays - fridayCount);

      // Days since last login
      const daysSinceLogin = lastSignIn
        ? Math.floor((now.getTime() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Health status
      let health: 'green' | 'yellow' | 'red' = 'green';
      if (daysSinceLogin === null) {
        health = 'red'; // Never logged in
      } else if (daysSinceLogin >= 14 || missedFridays >= 2) {
        health = 'red';
      } else if (daysSinceLogin >= 7 || missedFridays >= 1) {
        health = 'yellow';
      }

      // Override: if no reports ever, mark yellow at minimum
      const totalReportsEver = reportCounts.get(e.user_id) || 0;
      // (We only have this month's count; for "ever" we'd need a separate query.
      //  For now, use this month as a proxy. Can improve later.)

      return {
        enrollmentId: e.id,
        userId: e.user_id,
        name: e.full_name || e.email,
        email: e.email,
        companyName: (e.company as any)?.company_name || null,
        programName: (e.program as any)?.name || 'Unknown',
        programSlug: (e.program as any)?.slug || '',
        enrolledAt: e.enrolled_at,
        lastSignIn,
        daysSinceLogin,
        reportsThisMonth,
        fridaySubmissions: fridayCount,
        expectedFridays,
        missedFridays,
        documentsShared: docCount,
        health,
      };
    });

    // Sort: red first, then yellow, then green
    const healthOrder = { red: 0, yellow: 1, green: 2 };
    clients.sort((a: any, b: any) => healthOrder[a.health as keyof typeof healthOrder] - healthOrder[b.health as keyof typeof healthOrder]);

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('[Client Health] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/app/api/admin/client-health/route.ts
git commit -m "feat: add client health API with engagement scoring"
```

---

### Task 12: Add health cards to admin dashboard

**Files:**
- Modify: `apps/web/app/admin/page.tsx`

**Step 1: Add health cards section**

Add a new data fetch in the admin dashboard for client health:
```typescript
// Fetch client health data
const healthRes = await fetch('/api/admin/client-health', {
  headers: { Authorization: `Bearer ${key}` },
});
const healthData = await healthRes.json();
```

Add a "Client Health" section at the TOP of the dashboard (before the existing Overview/Reports/Users tabs):

Each health card renders as:
```tsx
<div className="bg-[#1A1A1A] border border-[#333333] p-5 relative">
  {/* Health dot */}
  <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
    client.health === 'green' ? 'bg-green-400' :
    client.health === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
  }`} />

  <h3 className="text-white font-bold">{client.companyName || client.name}</h3>
  <p className="text-[#999999] text-xs">{client.name} · {client.email}</p>
  <p className="text-[#666666] text-[10px] uppercase mt-1">{client.programName}</p>

  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
    <div>
      <p className="text-[#666666]">Last Login</p>
      <p className="text-white">{client.daysSinceLogin != null ? `${client.daysSinceLogin}d ago` : 'Never'}</p>
    </div>
    <div>
      <p className="text-[#666666]">Reports (Month)</p>
      <p className="text-white">{client.reportsThisMonth}</p>
    </div>
    <div>
      <p className="text-[#666666]">Friday Check-ins</p>
      <p className="text-white">{client.fridaySubmissions}/{client.expectedFridays}</p>
    </div>
    <div>
      <p className="text-[#666666]">Documents</p>
      <p className="text-white">{client.documentsShared}</p>
    </div>
  </div>

  <div className="flex gap-2 mt-4">
    <a href="/admin/reports" className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#E51B23] hover:border-[#E51B23]">
      Reports
    </a>
    <a href="/admin/clients" className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59]">
      Documents
    </a>
    <a href="/admin/five-minute-friday" className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#00D4FF] hover:border-[#00D4FF]">
      Fridays
    </a>
  </div>
</div>
```

Render as a responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

**Step 2: Add sidebar navigation**

Add a sidebar to the admin layout by wrapping the existing admin page content. The sidebar contains links to:
- Dashboard (`/admin`) — current page
- Clients (`/admin/clients`)
- Content (`/admin/content`)
- Reports (`/admin/reports`)
- 5-Minute Friday (`/admin/five-minute-friday`)

Simple sidebar: fixed-width left column with nav links, content fills remaining space. Dark background, active link highlighted with red left border.

If adding a layout file is cleaner, create `apps/web/app/admin/layout.tsx` with the sidebar nav and a `{children}` slot. But check first — if admin pages use different auth patterns (some use sessionStorage, some use API key), a shared layout may need to handle that. If it's too complex, just add inline nav links at the top of the admin dashboard page (same pattern as the existing nav links on `/admin/clients`).

**Step 3: Commit and push**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "feat: add client health cards and sidebar nav to admin dashboard"
git push origin main
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1. Slack | 1-4 | `lib/slack.ts`, alerts in 5 routes, daily digest cron |
| 2. File Drop | 5-8 | `client_documents` table, admin API, admin Documents panel, client portal page |
| 3. Content CRUD | 9-10 | PATCH/DELETE on content API, `/admin/content` page |
| 4. Health Dashboard | 11-12 | `/api/admin/client-health`, health cards on admin dashboard |

**Env vars needed:**
- `SLACK_WEBHOOK_URL` — Slack incoming webhook URL
- `CRON_SECRET` — Vercel cron authentication (auto-set on Vercel)

**Supabase setup needed:**
- Create `client_documents` table (Task 5 SQL)
- Create `client-documents` storage bucket (Task 5)
- Create `client_document_shared` event in Loops.so
