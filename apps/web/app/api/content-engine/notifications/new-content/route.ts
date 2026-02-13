import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'

interface ContentSource {
  id: string
  title: string | null
  synopsis: string | null
  theme_4e: string | null
  author_id: string | null
}

interface OrgMember {
  user_id: string
  users: {
    id: string
    email: string
    first_name: string | null
  }
}

interface NotificationPref {
  user_id: string
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
    const { data: membersData, error: membersError } = await supabase
      .from('content_org_members')
      .select(`
        user_id,
        users!inner(id, email, first_name)
      `)
      .eq('org_id', body.org_id)
      .not('accepted_at', 'is', null)

    const membersToNotify = (membersData as unknown as OrgMember[] | null) || []

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

    // Filter out the author
    const filteredMembers = source.author_id
      ? membersToNotify.filter(m => m.user_id !== source.author_id)
      : membersToNotify

    // Filter to only those with new_content_alerts enabled
    const userIds = filteredMembers.map(m => m.user_id)

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        notified: 0,
        sourceId: source.id,
      }, { status: 200 })
    }

    const { data: prefsData, error: prefsError } = await supabase
      .from('content_notification_prefs')
      .select('user_id')
      .in('user_id', userIds)
      .eq('new_content_alerts', true)

    const prefs = (prefsData as unknown as NotificationPref[] | null) || []

    if (prefsError) {
      throw new Error(`Failed to fetch prefs: ${prefsError.message}`)
    }

    const prefsUserIds = new Set(prefs.map(p => p.user_id))

    // Get all users who have any prefs set
    const { data: allPrefsData } = await supabase
      .from('content_notification_prefs')
      .select('user_id')
      .in('user_id', userIds)

    const allPrefs = (allPrefsData as unknown as NotificationPref[] | null) || []
    const usersWithPrefs = new Set(allPrefs.map(p => p.user_id))

    // Include users with no prefs (defaults to enabled) or those with alerts enabled
    const membersToAlert = filteredMembers.filter(m =>
      prefsUserIds.has(m.user_id) || !usersWithPrefs.has(m.user_id)
    )

    // Send notifications
    const notified: string[] = []

    for (const member of membersToAlert) {
      const memberUser = member.users
      if (!memberUser?.email) continue

      try {
        // TODO: Send via Resend
        console.log(`Would send new content alert to ${memberUser.email}`)
        notified.push(memberUser.email)

        // Log notification
        await (supabase as any).from('content_notifications').insert({
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
