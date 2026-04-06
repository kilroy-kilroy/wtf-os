# Session Transcripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin uploads VTT transcripts from Zoom, AI generates a synopsis + teaching, admin reviews/edits, then publishes to clients — 1:1s go to client documents, office hours go to the content library.

**Architecture:** Three API routes handle upload/process, regenerate, and publish. A new admin page at `/admin/sessions` manages the workflow. Client-facing pages (`/client/documents` and `/client/content`) are updated to render session content with synopsis, teaching, and a "Download Call Transcript" link.

**Tech Stack:** Next.js App Router, Supabase (storage + DB), Anthropic Claude API, existing admin auth pattern (Bearer token).

---

### Task 1: Database Migration — Add 'session' to client_content

**Files:**
- Create: `supabase/migrations/20260406_add_session_content_type.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add 'session' to client_content content_type CHECK constraint
ALTER TABLE client_content DROP CONSTRAINT IF EXISTS client_content_content_type_check;
ALTER TABLE client_content ADD CONSTRAINT client_content_content_type_check
  CHECK (content_type IN ('text', 'video', 'deck', 'pdf', 'link', 'session'));
```

- [ ] **Step 2: Apply the migration locally**

Run: `cd /Users/timkilroy/Projects/wtf-os && npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260406_add_session_content_type.sql
git commit -m "feat: add 'session' content_type to client_content table"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `apps/web/types/client.ts:257`

- [ ] **Step 1: Add 'session' to ContentType**

In `apps/web/types/client.ts`, change line 257:

```typescript
// Before:
export type ContentType = 'text' | 'video' | 'deck' | 'pdf' | 'link';

// After:
export type ContentType = 'text' | 'video' | 'deck' | 'pdf' | 'link' | 'session';
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/types/client.ts
git commit -m "feat: add 'session' to ContentType union"
```

---

### Task 3: VTT parsing utility

The existing `parseVttTranscript` in `apps/web/lib/zoom.ts` works but is tied to the Zoom OAuth flow. We need a standalone function that parses a VTT file uploaded as raw text. The existing parser already does exactly this — it takes a VTT string and returns formatted text. We just need to export a function that reads a File object and returns the parsed text.

**Files:**
- Create: `apps/web/lib/vtt.ts`

- [ ] **Step 1: Create the VTT utility**

```typescript
/**
 * Parse a VTT transcript file into readable text.
 * Reuses the same logic as zoom.ts parseVttTranscript but works with raw file content.
 */
export function parseVttContent(vttContent: string): string {
  const lines = vttContent.split('\n');
  const output: string[] = [];
  let currentSpeaker = '';
  let currentTimestamp = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match timestamp lines like "00:00:01.234 --> 00:00:05.678"
    const timestampMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.\d+ -->/);
    if (timestampMatch) {
      const hours = parseInt(timestampMatch[1]);
      const minutes = parseInt(timestampMatch[2]);
      const seconds = parseInt(timestampMatch[3]);
      const totalMinutes = hours * 60 + minutes;
      currentTimestamp = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
      continue;
    }

    // Match speaker lines like "Speaker Name: text"
    const speakerMatch = line.match(/^(.+?):\s*(.+)$/);
    if (speakerMatch && currentTimestamp) {
      currentSpeaker = speakerMatch[1];
      output.push(`[${currentTimestamp}] ${currentSpeaker}: ${speakerMatch[2]}`);
      currentTimestamp = '';
    } else if (line && !line.startsWith('WEBVTT') && !line.match(/^\d+$/) && currentTimestamp) {
      if (currentSpeaker) {
        output.push(`[${currentTimestamp}] ${currentSpeaker}: ${line}`);
      } else {
        output.push(`[${currentTimestamp}] ${line}`);
      }
      currentTimestamp = '';
    }
  }

  return output.join('\n');
}

/**
 * Strip the file extension from a filename to use as a title.
 */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.vtt$/i, '');
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/vtt.ts
git commit -m "feat: add standalone VTT parsing utility"
```

---

### Task 4: Session AI prompt + generation function

**Files:**
- Create: `apps/web/lib/session-ai.ts`

- [ ] **Step 1: Create the AI generation module**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const getAnthropic = () => new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface SessionAIResult {
  synopsis: string;
  teaching: string;
}

const SYSTEM_PROMPT = `You are Tim Kilroy, a sales coaching expert who uses the WTF (Why They Fund) methodology. You are generating content for your client portal from a call transcript.

Generate two sections:

SYNOPSIS:
- 2-3 paragraphs summarizing what was discussed
- Third-person neutral tone ("Tim and the group discussed..." or "Tim and [Client] discussed...")
- Focus on topics covered, questions asked, decisions made, and key moments
- For office hours: capture the different topics/questions that came up from the group
- For 1:1s: capture what was specific to that client's situation

TEACHING:
- Written in Tim's voice as the coach (first person)
- Extract 1-2 standalone principles or lessons from the call
- Should be valuable even to someone who wasn't on the call
- Actionable — give the reader something to do or think about differently
- Think "newsletter insight" not "meeting minutes"
- Tone: direct, warm, no jargon, conversational

Return ONLY valid JSON with this exact structure: { "synopsis": "...", "teaching": "..." }
Do not include any text outside the JSON object.`;

export async function generateSessionContent(
  transcript: string,
  type: 'office-hours' | 'one-on-one',
  clientName?: string,
): Promise<SessionAIResult> {
  const anthropic = getAnthropic();

  const callDescription = type === 'office-hours'
    ? 'an office hours group call'
    : `a monthly 1:1 coaching call with ${clientName || 'a client'}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is the transcript from ${callDescription}:\n\n${transcript}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text) as SessionAIResult;
  return parsed;
}

export async function regenerateField(
  transcript: string,
  field: 'synopsis' | 'teaching',
  type: 'office-hours' | 'one-on-one',
  clientName?: string,
): Promise<string> {
  const result = await generateSessionContent(transcript, type, clientName);
  return result[field];
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/session-ai.ts
git commit -m "feat: add AI generation for session synopsis + teaching"
```

---

### Task 5: API route — Upload & Process

**Files:**
- Create: `apps/web/app/api/admin/sessions/route.ts`

- [ ] **Step 1: Create the upload/process endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { parseVttContent, titleFromFilename } from '@/lib/vtt';
import { generateSessionContent } from '@/lib/session-ai';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// POST /api/admin/sessions
// Upload a VTT file, parse it, generate synopsis + teaching via AI.
// Returns draft content for review (does NOT publish yet).
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'office-hours' | 'one-on-one' | null;
    const targetId = formData.get('target_id') as string | null;
    const titleOverride = formData.get('title') as string | null;

    if (!file || !type || !targetId) {
      return NextResponse.json(
        { error: 'file, type, and target_id are required' },
        { status: 400 }
      );
    }

    // Read the VTT file
    const vttContent = await file.text();
    const parsedTranscript = parseVttContent(vttContent);

    if (!parsedTranscript.trim()) {
      return NextResponse.json(
        { error: 'VTT file appears to be empty or invalid' },
        { status: 400 }
      );
    }

    // Upload raw VTT to Supabase Storage
    const supabase = getSupabaseServerClient();
    const storagePath = type === 'one-on-one'
      ? `${targetId}/${Date.now()}-${file.name}`
      : `sessions/${Date.now()}-${file.name}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/vtt',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Sessions] Upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('client-documents')
      .getPublicUrl(storagePath);

    // Get client name for 1:1s (for the AI prompt)
    let clientName: string | undefined;
    if (type === 'one-on-one') {
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('user_id')
        .eq('id', targetId)
        .single();

      if (enrollment?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
        clientName = authUser?.user?.user_metadata?.full_name || undefined;
      }
    }

    // Generate synopsis + teaching via AI
    const aiResult = await generateSessionContent(parsedTranscript, type, clientName);

    const title = titleOverride || titleFromFilename(file.name);

    return NextResponse.json({
      title,
      synopsis: aiResult.synopsis,
      teaching: aiResult.teaching,
      vtt_url: urlData.publicUrl,
      original_filename: file.name,
      parsed_transcript: parsedTranscript,
    });
  } catch (error) {
    console.error('[Sessions] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/sessions — List all sessions (from both tables)
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Get 1:1 sessions from client_documents
    const { data: oneOnOnes } = await supabase
      .from('client_documents')
      .select('id, title, category, created_at, enrollment_id')
      .eq('category', 'session')
      .order('created_at', { ascending: false });

    // Get office hours sessions from client_content
    const { data: officeHours } = await supabase
      .from('client_content')
      .select('id, title, content_type, published, created_at, program_ids')
      .eq('content_type', 'session')
      .order('created_at', { ascending: false });

    // Enrich 1:1 sessions with client names
    const enrichedOneOnOnes = await Promise.all(
      (oneOnOnes || []).map(async (doc) => {
        let clientName = 'Unknown Client';
        if (doc.enrollment_id) {
          const { data: enrollment } = await supabase
            .from('client_enrollments')
            .select('user_id')
            .eq('id', doc.enrollment_id)
            .single();
          if (enrollment?.user_id) {
            const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
            clientName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email || 'Unknown';
          }
        }
        return {
          ...doc,
          session_type: 'one-on-one' as const,
          status: 'published' as const,
          target_name: clientName,
        };
      })
    );

    // Enrich office hours with program names
    const enrichedOfficeHours = await Promise.all(
      (officeHours || []).map(async (item) => {
        let programName = 'All Programs';
        if (item.program_ids && item.program_ids.length > 0) {
          const { data: programs } = await supabase
            .from('client_programs')
            .select('name')
            .in('id', item.program_ids);
          programName = programs?.map((p: any) => p.name).join(', ') || 'Unknown Program';
        }
        return {
          ...item,
          session_type: 'office-hours' as const,
          status: item.published ? 'published' as const : 'draft' as const,
          target_name: programName,
        };
      })
    );

    const sessions = [...enrichedOneOnOnes, ...enrichedOfficeHours]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Sessions] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/admin/sessions/route.ts
git commit -m "feat: add session upload/process and list API routes"
```

---

### Task 6: API route — Publish

**Files:**
- Create: `apps/web/app/api/admin/sessions/publish/route.ts`

- [ ] **Step 1: Create the publish endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { alertDocumentShared } from '@/lib/slack';
import { sendEvent } from '@/lib/loops';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// POST /api/admin/sessions/publish
// Publish a reviewed session to the appropriate table.
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, target_id, title, synopsis, teaching, vtt_url, original_filename } = body;

    if (!type || !target_id || !title || !synopsis || !teaching || !vtt_url) {
      return NextResponse.json(
        { error: 'type, target_id, title, synopsis, teaching, and vtt_url are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const contentBody = JSON.stringify({ synopsis, teaching, original_filename });

    if (type === 'one-on-one') {
      // Insert into client_documents
      const { data: doc, error } = await supabase
        .from('client_documents')
        .insert({
          enrollment_id: target_id,
          title,
          document_type: 'text',
          category: 'session',
          content_body: contentBody,
          file_url: vtt_url,
          file_name: original_filename,
        })
        .select()
        .single();

      if (error) {
        console.error('[Sessions] Publish 1:1 error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      // Notify via Slack + email
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('user_id')
        .eq('id', target_id)
        .single();

      if (enrollment?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
        const clientEmail = authUser?.user?.email || '';
        const clientName = authUser?.user?.user_metadata?.full_name || clientEmail || 'Client';

        alertDocumentShared(clientName, title);

        if (clientEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
          sendEvent({
            email: clientEmail,
            eventName: 'client_document_shared',
            eventProperties: {
              documentTitle: title,
              documentCategory: 'session',
              portalUrl: `${appUrl}/client/documents`,
            },
          }).catch(err => console.error('[Sessions] Loops event failed:', err));
        }
      }

      return NextResponse.json({ success: true, document: doc });
    } else if (type === 'office-hours') {
      // Resolve program slug to ID
      const { data: program } = await supabase
        .from('client_programs')
        .select('id')
        .eq('slug', target_id)
        .single();

      if (!program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 });
      }

      const { data: content, error } = await supabase
        .from('client_content')
        .insert({
          title,
          content_type: 'session',
          content_body: contentBody,
          content_url: vtt_url,
          program_ids: [program.id],
          published: true,
          published_at: new Date().toISOString(),
          sort_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[Sessions] Publish office hours error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({ success: true, content });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Sessions] Publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/admin/sessions/publish/route.ts
git commit -m "feat: add session publish API route"
```

---

### Task 7: API route — Regenerate

**Files:**
- Create: `apps/web/app/api/admin/sessions/regenerate/route.ts`

- [ ] **Step 1: Create the regenerate endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateSessionContent } from '@/lib/session-ai';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// POST /api/admin/sessions/regenerate
// Re-generate synopsis and/or teaching from transcript text.
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { transcript, field, type, client_name } = await request.json();

    if (!transcript || !type) {
      return NextResponse.json(
        { error: 'transcript and type are required' },
        { status: 400 }
      );
    }

    const result = await generateSessionContent(transcript, type, client_name);

    if (field === 'synopsis') {
      return NextResponse.json({ synopsis: result.synopsis });
    } else if (field === 'teaching') {
      return NextResponse.json({ teaching: result.teaching });
    } else {
      return NextResponse.json({ synopsis: result.synopsis, teaching: result.teaching });
    }
  } catch (error) {
    console.error('[Sessions] Regenerate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/admin/sessions/regenerate/route.ts
git commit -m "feat: add session regenerate API route"
```

---

### Task 8: Admin Sessions page

**Files:**
- Create: `apps/web/app/admin/sessions/page.tsx`

This is the largest task. The admin page has three states: auth gate, list view, and upload/review flow.

- [ ] **Step 1: Create the admin sessions page**

```tsx
'use client';

import { useState, useEffect } from 'react';

const PROGRAMS = [
  { slug: 'agency-studio', name: 'Agency Studio' },
  { slug: 'agency-studio-plus', name: 'Agency Studio+' },
  { slug: 'salesos-studio', name: 'SalesOS Studio' },
  { slug: 'salesos-growth', name: 'SalesOS Growth' },
  { slug: 'salesos-team', name: 'SalesOS Team' },
  { slug: 'demandos-studio', name: 'DemandOS Studio' },
  { slug: 'demandos-growth', name: 'DemandOS Growth' },
  { slug: 'demandos-team', name: 'DemandOS Team' },
];

type SessionType = 'office-hours' | 'one-on-one';
type ViewState = 'list' | 'upload' | 'review';

interface Enrollment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  program_name: string;
}

interface SessionListItem {
  id: string;
  title: string;
  session_type: SessionType;
  status: 'draft' | 'published';
  target_name: string;
  created_at: string;
}

interface DraftSession {
  title: string;
  synopsis: string;
  teaching: string;
  vtt_url: string;
  original_filename: string;
  parsed_transcript: string;
  type: SessionType;
  target_id: string;
}

export default function AdminSessionsPage() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<ViewState>('list');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload form state
  const [sessionType, setSessionType] = useState<SessionType>('one-on-one');
  const [targetId, setTargetId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  // Review state
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSynopsis, setEditSynopsis] = useState('');
  const [editTeaching, setEditTeaching] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadSessions(stored);
      loadEnrollments(stored);
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('admin_api_key', apiKey);
    setAuthed(true);
    loadSessions(apiKey);
    loadEnrollments(apiKey);
  }

  async function loadSessions(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
    setLoading(false);
  }

  async function loadEnrollments(key: string) {
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        const enrollmentList: Enrollment[] = (data.clients || []).map((c: any) => ({
          id: c.enrollment_id || c.id,
          user_id: c.user_id,
          user_name: c.full_name || c.email || 'Unknown',
          user_email: c.email || '',
          program_name: c.program_name || '',
        }));
        setEnrollments(enrollmentList);
      }
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  }

  async function handleUpload() {
    if (!file || !targetId) {
      alert('Please select a file and a target');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', sessionType);
      formData.append('target_id', targetId);

      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || 'Upload failed'}`);
        setUploading(false);
        return;
      }

      const data = await res.json();
      setDraft({
        title: data.title,
        synopsis: data.synopsis,
        teaching: data.teaching,
        vtt_url: data.vtt_url,
        original_filename: data.original_filename,
        parsed_transcript: data.parsed_transcript,
        type: sessionType,
        target_id: targetId,
      });
      setEditTitle(data.title);
      setEditSynopsis(data.synopsis);
      setEditTeaching(data.teaching);
      setView('review');
    } catch (err) {
      alert('Upload failed');
    }
    setUploading(false);
  }

  async function handleRegenerate(field: 'synopsis' | 'teaching' | 'both') {
    if (!draft) return;
    setRegenerating(field);
    try {
      const res = await fetch('/api/admin/sessions/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          transcript: draft.parsed_transcript,
          field,
          type: draft.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.synopsis) setEditSynopsis(data.synopsis);
        if (data.teaching) setEditTeaching(data.teaching);
      } else {
        alert('Regeneration failed');
      }
    } catch (err) {
      alert('Regeneration failed');
    }
    setRegenerating(null);
  }

  async function handlePublish() {
    if (!draft) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/sessions/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: draft.type,
          target_id: draft.target_id,
          title: editTitle,
          synopsis: editSynopsis,
          teaching: editTeaching,
          vtt_url: draft.vtt_url,
          original_filename: draft.original_filename,
        }),
      });

      if (res.ok) {
        setDraft(null);
        setView('list');
        setFile(null);
        setTargetId('');
        await loadSessions(apiKey);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Publish failed'}`);
      }
    } catch (err) {
      alert('Publish failed');
    }
    setPublishing(false);
  }

  // ── Auth gate ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: Sessions</h1>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Admin API Key"
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none"
          />
          <button type="submit" className="w-full bg-[#E51B23] text-white py-3 font-anton uppercase">
            Access
          </button>
        </form>
      </div>
    );
  }

  // ── Review view ──
  if (view === 'review' && draft) {
    return (
      <div className="min-h-screen bg-black text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Review Session</h1>
            <button
              onClick={() => { setView('list'); setDraft(null); }}
              className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
              />
            </div>

            {/* Synopsis */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] tracking-[2px] text-[#666666] uppercase">Synopsis</label>
                <button
                  onClick={() => handleRegenerate('synopsis')}
                  disabled={regenerating !== null}
                  className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors disabled:opacity-50"
                >
                  {regenerating === 'synopsis' ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              <textarea
                value={editSynopsis}
                onChange={(e) => setEditSynopsis(e.target.value)}
                rows={8}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-y text-sm leading-relaxed"
              />
            </div>

            {/* Teaching */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] tracking-[2px] text-[#666666] uppercase">Teaching</label>
                <button
                  onClick={() => handleRegenerate('teaching')}
                  disabled={regenerating !== null}
                  className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors disabled:opacity-50"
                >
                  {regenerating === 'teaching' ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              <textarea
                value={editTeaching}
                onChange={(e) => setEditTeaching(e.target.value)}
                rows={8}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-y text-sm leading-relaxed"
              />
            </div>

            {/* VTT download preview */}
            <div className="bg-[#1A1A1A] border border-[#333333] p-4">
              <p className="text-[#999999] text-sm">
                Call transcript: <a href={draft.vtt_url} target="_blank" className="text-[#00D4FF] hover:underline">{draft.original_filename}</a>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-[#E51B23] text-white px-8 py-3 font-anton uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
              <button
                onClick={() => handleRegenerate('both')}
                disabled={regenerating !== null}
                className="border border-[#333333] text-[#999999] px-6 py-3 font-anton uppercase hover:text-white hover:border-white transition-colors disabled:opacity-50"
              >
                {regenerating === 'both' ? 'Regenerating...' : 'Regenerate Both'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List + Upload view ──
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Sessions</h1>
          <div className="flex gap-3">
            <a href="/admin/content" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Content Library
            </a>
            <a href="/admin/clients" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Clients
            </a>
            <a href="/admin" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Main Admin
            </a>
          </div>
        </div>

        {/* Upload Form */}
        {view === 'upload' && (
          <div className="bg-[#1A1A1A] border border-[#333333] p-6 mb-8">
            <h2 className="text-xl font-anton uppercase text-[#FFDE59] mb-4">Upload Session Transcript</h2>
            <div className="space-y-4">
              {/* Session type */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Session Type *</label>
                <select
                  value={sessionType}
                  onChange={(e) => { setSessionType(e.target.value as SessionType); setTargetId(''); }}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                >
                  <option value="one-on-one">Monthly 1:1</option>
                  <option value="office-hours">Office Hours</option>
                </select>
              </div>

              {/* Target selection */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">
                  {sessionType === 'one-on-one' ? 'Client *' : 'Program *'}
                </label>
                {sessionType === 'one-on-one' ? (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  >
                    <option value="">Select a client...</option>
                    {enrollments.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.user_name} {e.program_name ? `(${e.program_name})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  >
                    <option value="">Select a program...</option>
                    {PROGRAMS.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* File upload */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">VTT File *</label>
                <input
                  type="file"
                  accept=".vtt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-[#999999] text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-[#333333] file:bg-black file:text-white file:font-bold file:uppercase file:text-xs file:cursor-pointer hover:file:border-[#E51B23]"
                />
                {file && (
                  <p className="text-[#666666] text-xs mt-1">Title will be: &quot;{file.name.replace(/\.vtt$/i, '')}&quot;</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file || !targetId}
                  className="bg-[#E51B23] text-white px-6 py-2 font-anton uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Processing...' : 'Upload & Generate'}
                </button>
                <button
                  onClick={() => { setView('list'); setFile(null); setTargetId(''); }}
                  className="border border-[#333333] text-[#999999] px-6 py-2 font-anton uppercase hover:text-white hover:border-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload button */}
        {view === 'list' && (
          <div className="mb-6">
            <button
              onClick={() => setView('upload')}
              className="bg-[#E51B23] text-white px-6 py-2 font-anton uppercase hover:bg-red-700 transition-colors"
            >
              + Upload Session
            </button>
          </div>
        )}

        {/* Sessions table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Title</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-28">Type</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Target</th>
                <th className="text-center py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-24">Status</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-28">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#666666]">Loading...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#666666]">No sessions yet. Click &quot;+ Upload Session&quot; above.</td></tr>
              ) : (
                sessions.map(session => (
                  <tr key={session.id} className="border-b border-[#222222] hover:bg-[#111111]">
                    <td className="py-3 px-2 text-white">{session.title}</td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        session.session_type === 'office-hours'
                          ? 'text-[#FFDE59] border-[#FFDE59]'
                          : 'text-[#00D4FF] border-[#00D4FF]'
                      }`}>
                        {session.session_type === 'office-hours' ? 'Office Hours' : '1:1'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#999999]">{session.target_name}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[10px] font-bold uppercase ${
                        session.status === 'published' ? 'text-[#22c55e]' : 'text-[#FFDE59]'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#666666] text-xs">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Run: `cd /Users/timkilroy/Projects/wtf-os && npm run dev`

Navigate to `http://localhost:3000/admin/sessions` and verify:
- Auth gate appears
- After entering API key, list view shows
- "Upload Session" button toggles the upload form
- Client and program dropdowns populate

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/sessions/page.tsx
git commit -m "feat: add admin sessions page for VTT upload and review"
```

---

### Task 9: Update client documents page — render session content

**Files:**
- Modify: `apps/web/app/client/documents/page.tsx`

- [ ] **Step 1: Add 'session' to category labels and colors**

In `apps/web/app/client/documents/page.tsx`, update the `CATEGORY_LABELS` and `CATEGORY_COLORS` objects:

```typescript
const CATEGORY_LABELS: Record<string, string> = {
  roadmap: 'Roadmap',
  transcript: 'Transcript',
  plan: 'Plan',
  resource: 'Resource',
  session: 'Session',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  roadmap: '#FFDE59',
  transcript: '#00D4FF',
  plan: '#22c55e',
  resource: '#a855f7',
  session: '#E51B23',
  other: '#666666',
};
```

- [ ] **Step 2: Update the text modal to handle session content**

Replace the text modal at the bottom of the component (the `{textModal && ...}` block) with:

```tsx
{/* Text/Session content modal */}
{textModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setTextModal(null)}>
    <div className="bg-[#1A1A1A] border border-[#333333] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-anton uppercase text-[#E51B23]">{textModal.title}</h2>
        <button onClick={() => setTextModal(null)} className="text-[#999999] hover:text-white text-xl">&times;</button>
      </div>

      {textModal.category === 'session' && textModal.content_body ? (() => {
        try {
          const session = JSON.parse(textModal.content_body);
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">What We Covered</h3>
                <div className="text-[#CCCCCC] text-sm whitespace-pre-wrap leading-relaxed">
                  {session.synopsis}
                </div>
              </div>
              <div>
                <h3 className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">Key Takeaway</h3>
                <div className="text-[#CCCCCC] text-sm whitespace-pre-wrap leading-relaxed">
                  {session.teaching}
                </div>
              </div>
              {textModal.file_url && (
                <div className="pt-4 border-t border-[#333333]">
                  <a
                    href={textModal.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#00D4FF] hover:underline"
                  >
                    Download Call Transcript
                    <span className="text-[#666666] text-xs">(timestamped transcript)</span>
                  </a>
                </div>
              )}
            </div>
          );
        } catch {
          return (
            <div className="text-[#CCCCCC] text-sm whitespace-pre-wrap leading-relaxed">
              {textModal.content_body}
            </div>
          );
        }
      })() : (
        <div className="text-[#CCCCCC] text-sm whitespace-pre-wrap leading-relaxed">
          {textModal.content_body}
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/client/documents/page.tsx
git commit -m "feat: render session synopsis + teaching in client documents"
```

---

### Task 10: Update client content page — render session content

**Files:**
- Modify: `apps/web/app/client/content/page.tsx`

- [ ] **Step 1: Add 'session' to type icons and labels**

In `apps/web/app/client/content/page.tsx`, update the constants:

```typescript
const TYPE_ICONS: Record<string, string> = {
  video: '▶',
  deck: '◻',
  pdf: '◼',
  text: '≡',
  link: '↗',
  session: '◉',
};

const TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  deck: 'Deck',
  pdf: 'PDF',
  text: 'Article',
  link: 'Link',
  session: 'Session',
};
```

- [ ] **Step 2: Update the click handler to open session content**

In the grid item's `onClick` handler, update the condition to also open sessions in the modal:

```typescript
onClick={() => {
  if (item.content_type === 'text' || item.content_type === 'session') {
    setSelectedItem(item);
  } else if (item.content_url) {
    window.open(item.content_url, '_blank');
  }
}}
```

- [ ] **Step 3: Update the text content modal to handle sessions**

Replace the modal (the `{selectedItem && selectedItem.content_type === 'text' && ...}` block) with:

```tsx
{/* Text/Session content modal */}
{selectedItem && (selectedItem.content_type === 'text' || selectedItem.content_type === 'session') && (
  <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-6">
    <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#1A1A1A] border border-[#333333] p-8">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-anton uppercase text-[#E51B23]">{selectedItem.title}</h2>
        <button onClick={() => setSelectedItem(null)}
          className="text-[#666666] hover:text-white text-lg">
          ✕
        </button>
      </div>

      {selectedItem.content_type === 'session' && selectedItem.content_body ? (() => {
        try {
          const session = JSON.parse(selectedItem.content_body);
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">What We Covered</h3>
                <div className="text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
                  {session.synopsis}
                </div>
              </div>
              <div>
                <h3 className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">Key Takeaway</h3>
                <div className="text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
                  {session.teaching}
                </div>
              </div>
              {selectedItem.content_url && (
                <div className="pt-4 border-t border-[#333333]">
                  <a
                    href={selectedItem.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#00D4FF] hover:underline"
                  >
                    Download Call Transcript
                    <span className="text-[#666666] text-xs">(timestamped transcript)</span>
                  </a>
                </div>
              )}
            </div>
          );
        } catch {
          return (
            <div className="prose prose-invert max-w-none text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
              {selectedItem.content_body}
            </div>
          );
        }
      })() : (
        <div className="prose prose-invert max-w-none text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
          {selectedItem.content_body}
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/client/content/page.tsx
git commit -m "feat: render session content in client resource library"
```

---

### Task 11: Add admin sessions link to admin navigation

**Files:**
- Modify: `apps/web/app/admin/content/page.tsx`

- [ ] **Step 1: Add Sessions link to the admin content page header**

In `apps/web/app/admin/content/page.tsx`, add a Sessions nav link in the header's `flex gap-3` div (around line 276), before the existing "Clients" link:

```tsx
<a href="/admin/sessions" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
  Sessions
</a>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/admin/content/page.tsx
git commit -m "feat: add sessions link to admin navigation"
```

---

### Task 12: Verify end-to-end flow

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/timkilroy/Projects/wtf-os && npm run dev`

- [ ] **Step 2: Test the admin upload flow**

1. Navigate to `http://localhost:3000/admin/sessions`
2. Authenticate with admin API key
3. Click "Upload Session"
4. Select "Monthly 1:1", pick a client, upload a `.vtt` file
5. Verify the review screen shows with synopsis + teaching
6. Edit the text, then click Publish
7. Verify the session appears in the list

- [ ] **Step 3: Test the client documents view**

1. Log in as the client you published the 1:1 session to
2. Navigate to `/client/documents`
3. Verify the session appears with the "Session" category badge
4. Click it and verify the modal shows "What We Covered", "Key Takeaway", and "Download Call Transcript"

- [ ] **Step 4: Test the client content library view**

1. Upload an Office Hours session for a program
2. Log in as a client enrolled in that program
3. Navigate to `/client/content`
4. Verify the session appears in the resource library grid
5. Click it and verify the modal renders correctly

- [ ] **Step 5: Commit any fixes needed**
