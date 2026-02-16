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
