import { getSupabaseServerClient } from '@/lib/supabase-server';

// Anonymous lead-report tables + their email column. user_id is back-filled
// when a user authenticates with a matching (verified) email.
const CLAIM_TABLES: { table: string; emailCol: string }[] = [
  { table: 'visibility_lab_reports', emailCol: 'email' },
  { table: 'discovery_briefs', emailCol: 'lead_email' },
  { table: 'instant_reports', emailCol: 'email' },
  { table: 'biz_dev_assessments', emailCol: 'email' },
];

// Claim every anonymous report whose email matches `email` for `userId`.
// Service-role, but only ever matches the authenticated user's own email.
// Idempotent; never throws (per-table failures are logged and skipped).
export async function claimReportsByEmail(
  email: string | null | undefined,
  userId: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (!email) return result;
  const supabase = getSupabaseServerClient();
  const target = email.toLowerCase();
  for (const { table, emailCol } of CLAIM_TABLES) {
    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .update({ user_id: userId })
        .ilike(emailCol, target) // no wildcards => case-insensitive exact match
        .is('user_id', null)
        .select('id');
      if (error) {
        console.error(`[claim] ${table} failed:`, error.message);
        result[table] = 0;
        continue;
      }
      result[table] = data?.length ?? 0;
    } catch (e) {
      console.error(`[claim] ${table} threw:`, e);
      result[table] = 0;
    }
  }
  return result;
}
