import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'

interface ContentSource {
  id: string
  title: string | null
  synopsis: string | null
  theme_4e: string | null
  author_id: string | null
}

/**
 * POST /api/content-engine/notifications/new-content
 * Send new content alert to team members
 * Called after new content is added by Brand Official
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.source_id || !body.org_id) {
      return NextResponse.json({ error: 'source_id and org_id are required' }, { status: 400 })
    }

    // Get the source content
    const { data: sourceData, error: sourceError } = await supabase
      .from('content_sources')
      .select('id, title, synopsis, theme_4e, author_id')
      .eq('id', body.source_id)
      .single()

    const source = sourceData as ContentSource | null

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Get org members who want new content alerts
    const { data: membersToNotify, error: membersError } = await supabase
      .from('content_org_members')
      .select(`
        user_id,
        users!inner(id, email, first_name)
      `)
      .eq('org_id', body.org_id)
      .not('accepted_at', 'is', null)
      .neq('user_id', source.author_id) // Don't notify the author

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

    // Filter to only those with new_content_alerts enabled
    const userIds = membersToNotify?.map(m => m.user_id) || []

    const { data: prefs, error: prefsError } = await supabase
      .from('content_notification_prefs')
      .select('user_id')
      .in('user_id', userIds)
      .eq('new_content_alerts', true)

    if (prefsError) {
      throw new Error(`Failed to fetch prefs: ${prefsError.message}`)
    }

    const prefsUserIds = new Set(prefs?.map(p => p.user_id) || [])

    // Include users with no prefs (defaults to enabled)
    const usersWithPrefs = new Set((await supabase
      .from('content_notification_prefs')
      .select('user_id')
      .in('user_id', userIds)).data?.map(p => p.user_id) || [])

    const membersToAlert = membersToNotify?.filter(m =>
      prefsUserIds.has(m.user_id) || !usersWithPrefs.has(m.user_id)
    ) || []

    // Get author name for the notification
    const { data: author } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', source.author_id)
      .single()

    const authorName = author
      ? [author.first_name, author.last_name].filter(Boolean).join(' ') || 'Someone'
      : 'Someone'

    // Send notifications
    const notified: string[] = []

    for (const member of membersToAlert) {
      const memberUser = (member as any).users
      if (!memberUser?.email) continue

      try {
        // TODO: Send via Resend
        console.log(`Would send new content alert to ${memberUser.email}`)
        notified.push(memberUser.email)

        // Log notification
        await supabase.from('content_notifications').insert({
          org_id: body.org_id,
          user_id: member.user_id,
          notification_type: 'new_content',
          reference_id: source.id,
        })
      } catch (emailError) {
        console.error(`Failed to notify ${memberUser.email}:`, emailError)
      }
    }

    return NextResponse.json({
      success: true,
      notified: notified.length,
      sourceId: source.id,
    }, { status: 200 })
  } catch (error) {
    console.error('Error sending new content notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
