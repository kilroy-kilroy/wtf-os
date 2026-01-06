import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'

interface NotificationPref {
  user_id: string
}

interface OrgMembership {
  user_id: string
  org_id: string
}

interface ContentItem {
  id: string
  org_id: string
  title: string | null
  synopsis: string | null
  theme_4e: string | null
  created_at: string
}

interface User {
  id: string
  email: string
  first_name: string | null
}

/**
 * POST /api/cron/content-digest
 * Send weekly content digest emails
 * Called by Vercel Cron or similar scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get today's day of week
    const today = new Date()
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()]

    // Get users who want digest today
    const { data: prefsData, error: prefsError } = await supabase
      .from('content_notification_prefs')
      .select('user_id')
      .eq('weekly_digest', true)
      .eq('digest_day', dayOfWeek)

    const prefsToNotify = (prefsData as unknown as NotificationPref[] | null) || []

    if (prefsError) {
      throw new Error(`Failed to fetch notification prefs: ${prefsError.message}`)
    }

    if (prefsToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No users to notify on ${dayOfWeek}`,
        sent: 0,
      }, { status: 200 })
    }

    const userIds = prefsToNotify.map(p => p.user_id)

    // Get users with their org memberships
    const { data: membershipsData, error: membershipsError } = await supabase
      .from('content_org_members')
      .select('user_id, org_id')
      .in('user_id', userIds)
      .not('accepted_at', 'is', null)

    const memberships = (membershipsData as unknown as OrgMembership[] | null) || []

    if (membershipsError) {
      throw new Error(`Failed to fetch memberships: ${membershipsError.message}`)
    }

    // Get content from the last week for each org
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const orgIds = [...new Set(memberships.map(m => m.org_id))]

    if (orgIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No org memberships found for users',
        sent: 0,
      }, { status: 200 })
    }

    const { data: contentData, error: contentError } = await supabase
      .from('content_sources')
      .select('id, org_id, title, synopsis, theme_4e, created_at')
      .in('org_id', orgIds)
      .eq('visibility', 'team')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })

    const newContent = (contentData as unknown as ContentItem[] | null) || []

    if (contentError) {
      throw new Error(`Failed to fetch content: ${contentError.message}`)
    }

    // Group content by org
    const contentByOrg: Record<string, ContentItem[]> = {}
    for (const content of newContent) {
      if (!contentByOrg[content.org_id]) {
        contentByOrg[content.org_id] = []
      }
      contentByOrg[content.org_id].push(content)
    }

    // Get user emails
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .in('id', userIds)

    const users = (usersData as unknown as User[] | null) || []

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    // Build and send digests
    const sentTo: string[] = []
    const errors: string[] = []

    for (const user of users) {
      const userMemberships = memberships.filter(m => m.user_id === user.id)
      if (userMemberships.length === 0) continue

      // Get content for user's orgs
      const userContent = userMemberships.flatMap(m => contentByOrg[m.org_id] || [])

      if (userContent.length === 0) {
        continue // No new content to report
      }

      // Build digest email content
      const digestHtml = buildDigestEmail(user.first_name || 'there', userContent)

      // Send via Resend (or your email provider)
      try {
        // TODO: Implement actual email sending via Resend
        // For now, just log
        console.log(`Would send digest to ${user.email} with ${userContent.length} items`)
        sentTo.push(user.email)

        // Example Resend implementation:
        // await resend.emails.send({
        //   from: 'Content Hub <digest@yourdomain.com>',
        //   to: user.email,
        //   subject: `Your Weekly Content Digest - ${userContent.length} new pieces`,
        //   html: digestHtml,
        // })
      } catch (emailError) {
        console.error(`Failed to send digest to ${user.email}:`, emailError)
        errors.push(user.email)
      }
    }

    return NextResponse.json({
      success: true,
      day: dayOfWeek,
      totalUsers: prefsToNotify.length,
      sent: sentTo.length,
      errors: errors.length,
    }, { status: 200 })
  } catch (error) {
    console.error('Error sending content digests:', error)
    return NextResponse.json(
      { error: 'Failed to send digests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildDigestEmail(firstName: string, content: ContentItem[]): string {
  const contentItems = content.slice(0, 10).map(c => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e8e0d5;">
        <div style="font-size: 12px; color: #c45a3b; text-transform: uppercase; margin-bottom: 4px;">
          ${c.theme_4e || 'Content'}
        </div>
        <div style="font-size: 16px; color: #2d2a26; margin-bottom: 8px;">
          ${c.title || (c.synopsis ? c.synopsis.slice(0, 60) + '...' : 'Untitled')}
        </div>
        <div style="font-size: 14px; color: #8a8078;">
          ${c.synopsis ? c.synopsis.slice(0, 120) : ''}${c.synopsis && c.synopsis.length > 120 ? '...' : ''}
        </div>
      </td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf8f5; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e8e0d5;">
          <div style="background: #c45a3b; padding: 24px 32px;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">
              Your Weekly Content Digest
            </h1>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #2d2a26; margin: 0 0 24px 0;">
              Hey ${firstName},
            </p>
            <p style="font-size: 16px; color: #6b635a; margin: 0 0 24px 0;">
              Here's what's new in your content repository this week. ${content.length} piece${content.length !== 1 ? 's' : ''} ready to repurpose.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              ${contentItems}
            </table>
            <div style="margin-top: 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/content-hub/repository"
                 style="display: inline-block; background: #c45a3b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                View All Content
              </a>
            </div>
          </div>
          <div style="padding: 24px 32px; background: #faf8f5; text-align: center;">
            <p style="font-size: 12px; color: #8a8078; margin: 0;">
              You're receiving this because you enabled weekly digests.
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/content-hub/settings" style="color: #c45a3b;">Manage preferences</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Content digest cron endpoint. Use POST to trigger.',
    usage: 'POST /api/cron/content-digest with Authorization: Bearer <CRON_SECRET>',
  })
}
