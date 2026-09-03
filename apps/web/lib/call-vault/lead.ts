import { waitUntil } from '@vercel/functions';
import { onCallVaultSubmitted } from '@/lib/loops';
import { addCallVaultSubscriber } from '@/lib/beehiiv';
import { copperSyncLead, COPPER_STAGES } from '@/lib/copper';
import { alertReportGenerated } from '@/lib/slack';

/**
 * Fan out a completed Call Vault submission.
 *
 * Every leg is individually caught and wrapped in waitUntil: a Loops, Beehiiv,
 * Copper, or Slack hiccup must never fail a contributor's submission. They did
 * us a favour; the worst outcome is losing their upload to a third-party blip.
 * Mirrors lib/wah-wah/lead.ts.
 */
export async function captureCallVaultLead(params: {
  contributorId: string;
  email: string;
  name: string;
  agencyName: string | null;
  callCount: number;
  ndaSigned: boolean;
  resumeUrl: string;
}): Promise<void> {
  const { email, name, agencyName, callCount, ndaSigned, resumeUrl } = params;
  const firstName = (name || '').trim().split(/\s+/)[0] || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  waitUntil(
    addCallVaultSubscriber(email, agencyName || undefined, firstName || undefined).catch((err) =>
      console.error('[call-vault] beehiiv subscribe failed:', err)
    )
  );

  waitUntil(
    copperSyncLead({
      email,
      name: name || undefined,
      companyName: agencyName || undefined,
      productName: 'Call Vault',
      opportunityValue: 0,
      stageId: COPPER_STAGES.LEAD,
      note:
        `Contributed ${callCount} call(s) to the Call Vault. NDA: ${ndaSigned ? 'signed' : 'skipped'}. ` +
        `Review: ${appUrl}/admin/call-vault/${params.contributorId}`,
    }).catch((err) => console.error('[call-vault] copper sync failed:', err))
  );

  alertReportGenerated(name ? `${name} (${email})` : email, 'call-vault', agencyName || '—');

  waitUntil(
    onCallVaultSubmitted({
      email,
      firstName,
      agencyName: agencyName || undefined,
      callCount,
      ndaSigned,
      resumeUrl,
    }).catch((err) => console.error('[call-vault] loops event failed:', err))
  );
}
