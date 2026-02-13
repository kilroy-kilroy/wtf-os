import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@repo/db/client'
import {
  getCallImportById,
  updateCallImport,
  getUserMembership,
  createContentSource,
} from '@repo/db/queries/content-engine'
import { runModel, parseModelJSON, retryWithBackoff } from '@repo/utils'
import {
  MOMENT_DETECTION_SYSTEM,
  MOMENT_DETECTION_USER,
  type MomentDetectionResponse,
} from '@repo/prompts/content-engine'
import type { ContentMoment } from '@repo/db/types/content-engine'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/content-engine/calls/[id]
 * Get a single call import with extracted moments
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()

    const call = await getCallImportById(serviceClient, id)
    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Check membership
    const membership = await getUserMembership(serviceClient, call.org_id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not authorized to view this call' }, { status: 403 })
    }

    return NextResponse.json({ call }, { status: 200 })
  } catch (error) {
    console.error('Error fetching call:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-engine/calls/[id]/extract
 * Run moment detection on a call
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()

    const call = await getCallImportById(serviceClient, id)
    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Check membership
    const membership = await getUserMembership(serviceClient, call.org_id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Update status to processing
    await updateCallImport(serviceClient, id, { processing_status: 'processing' })

    // Run moment detection
    try {
      const response = await retryWithBackoff(async () => {
        return await runModel(
          'content-engine-moment-detection',
          MOMENT_DETECTION_SYSTEM,
          MOMENT_DETECTION_USER({
            transcript: call.transcript,
            callTitle: call.title || undefined,
            callType: call.call_type || undefined,
            participants: call.participants || [],
          })
        )
      })

      const moments = parseModelJSON<ContentMoment[]>(response.content)

      // Update call with extracted moments
      const updatedCall = await updateCallImport(serviceClient, id, {
        processing_status: 'completed',
        extracted_moments: moments,
      })

      return NextResponse.json({
        call: updatedCall,
        momentsCount: moments.length,
      }, { status: 200 })
    } catch (extractionError) {
      console.error('Moment extraction failed:', extractionError)

      await updateCallImport(serviceClient, id, { processing_status: 'failed' })

      return NextResponse.json(
        { error: 'Failed to extract moments', details: extractionError instanceof Error ? extractionError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error extracting moments:', error)
    return NextResponse.json(
      { error: 'Failed to process call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
