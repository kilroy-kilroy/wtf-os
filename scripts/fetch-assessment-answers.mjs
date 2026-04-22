/**
 * Print the client intake answers (and follow-up answers) for a GrowthOS assessment.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fetch-assessment-answers.mjs <assessment-id>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY so RLS is bypassed.
 */
import { createClient } from '@supabase/supabase-js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/fetch-assessment-answers.mjs <assessment-id>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await supabase
  .from('assessments')
  .select('id, status, created_at, completed_at, intake_data, scores')
  .eq('id', id)
  .maybeSingle();

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}
if (!data) {
  console.error(`No assessment found with id ${id}`);
  process.exit(1);
}

const { intake_data, scores, ...meta } = data;
console.log(JSON.stringify({
  ...meta,
  intake_data,
  followUpQuestions: scores?.followUpQuestions ?? null,
  followUpAnswers: scores?.followUpAnswers ?? null,
}, null, 2));
