import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'
import {
  getNotificationPrefs,
  upsertNotificationPrefs,
} from '@repo/db/queries/content-engine'
import type { DigestDay } from '@repo/db/types/content-engine'

/**
 * GET /api/content-engine/notifications/preferences
 * Get user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prefs = await getNotificationPrefs(supabase, user.id)

    // Return defaults if no prefs set
    return NextResponse.json({
      preferences: prefs || {
        new_content_alerts: true,
        call_gold_alerts: true,
        weekly_digest: true,
        digest_day: 'monday',
      },
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/content-engine/notifications/preferences
 * Update user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate digest day
    const validDays: DigestDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const digestDay = validDays.includes(body.digest_day) ? body.digest_day : undefined

    const prefs = await upsertNotificationPrefs(supabase, user.id, {
      new_content_alerts: typeof body.new_content_alerts === 'boolean' ? body.new_content_alerts : undefined,
      call_gold_alerts: typeof body.call_gold_alerts === 'boolean' ? body.call_gold_alerts : undefined,
      weekly_digest: typeof body.weekly_digest === 'boolean' ? body.weekly_digest : undefined,
      digest_day: digestDay,
    })

    return NextResponse.json({ preferences: prefs }, { status: 200 })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
