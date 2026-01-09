import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@repo/db/client'
import {
  getUserMembership,
  getUserOrgs,
  createCallImport,
} from '@repo/db/queries/content-engine'

/**
 * Fireflies GraphQL API client
 */
async function firefliesQuery(apiKey: string, query: string, variables?: Record<string, any>) {
  const response = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Fireflies API error: ${response.statusText}`)
  }

  const data = await response.json()
  if (data.errors) {
    throw new Error(`Fireflies GraphQL error: ${data.errors[0].message}`)
  }

  return data.data
}

/**
 * POST /api/content-engine/integrations/fireflies/sync
 * Sync recent transcripts from Fireflies
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()

    // Get user's org
    const orgs = await getUserOrgs(serviceClient, user.id)
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const org = orgs[0]
    const settings = (org as any).settings || {}
    const firefliesConfig = settings.fireflies || null

    if (!firefliesConfig?.api_key) {
      return NextResponse.json({ error: 'Fireflies not connected' }, { status: 400 })
    }

    // Check membership
    const membership = await getUserMembership(serviceClient, org.id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const limit = body.limit || 10

    // Fetch recent transcripts from Fireflies
    const query = `
      query GetTranscripts($limit: Int!) {
        transcripts(limit: $limit) {
          id
          title
          date
          duration
          participants
          transcript_url
          sentences {
            text
            speaker_name
            start_time
            end_time
          }
          summary {
            overview
            action_items
            keywords
          }
        }
      }
    `

    let transcripts
    try {
      const result = await firefliesQuery(firefliesConfig.api_key, query, { limit })
      transcripts = result.transcripts || []
    } catch (apiError) {
      console.error('Fireflies API error:', apiError)
      return NextResponse.json(
        { error: 'Failed to fetch transcripts from Fireflies', details: apiError instanceof Error ? apiError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Import each transcript
    const imported = []
    const skipped = []

    for (const t of transcripts) {
      // Check if already imported
      const { data: existing } = await (serviceClient as any)
        .from('content_call_imports')
        .select('id')
        .eq('org_id', org.id)
        .eq('provider', 'fireflies')
        .eq('external_id', t.id)
        .single()

      if (existing) {
        skipped.push(t.id)
        continue
      }

      // Build full transcript text from sentences
      const transcriptText = t.sentences
        ?.map((s: any) => `[${s.speaker_name}]: ${s.text}`)
        .join('\n') || ''

      // Create call import
      // Note: Fireflies returns date as Unix timestamp in milliseconds
      const callDate = t.date ? new Date(Number(t.date)).toISOString() : null

      const callImport = await createCallImport(serviceClient, {
        org_id: org.id,
        user_id: user.id,
        provider: 'fireflies',
        external_id: t.id,
        external_url: t.transcript_url,
        title: t.title,
        participants: t.participants || [],
        duration_seconds: t.duration ? Math.round(t.duration / 1000) : null,
        call_date: callDate,
        transcript: transcriptText,
        summary: t.summary?.overview || null,
        processing_status: 'pending',
      })

      imported.push({
        id: callImport.id,
        external_id: t.id,
        title: t.title,
      })
    }

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      calls: imported,
    }, { status: 200 })
  } catch (error) {
    console.error('Error syncing Fireflies:', error)
    return NextResponse.json(
      { error: 'Failed to sync transcripts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
