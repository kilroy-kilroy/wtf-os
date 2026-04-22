/**
 * Backfill missing Loops events for records created between
 * 2026-04-01 (when loops_events audit logging was deployed) and today.
 *
 * Source-of-truth rows are joined against loops_events to find gaps.
 * Tim's own test emails (tk@timkilroy.com, tim@timkilroy.com) are skipped.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const LOOPS = 'https://app.loops.so/api/v1';
const apiKey = process.env.LOOPS_API_KEY;
const APP_URL = 'https://app.timkilroy.com';
const SKIP_EMAILS = new Set(['tk@timkilroy.com', 'tim@timkilroy.com', 'tim2@timkilroy.com']);
const DRY = process.env.DRY === '1';

async function sendEvent({ email, eventName, eventProperties, userId = null }) {
  if (DRY) {
    console.log(`[DRY] would fire ${eventName} → ${email}`, eventProperties);
    return { ok: true };
  }
  const res = await fetch(LOOPS + '/events/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, eventName, eventProperties }),
  });
  const body = await res.text();
  console.log(`[${eventName}] ${email} → ${res.status} ${body.slice(0, 80)}`);
  if (res.ok) {
    const { error: insErr } = await supabase.from('loops_events').insert({
      user_email: email,
      user_id: userId,
      event_name: eventName,
      event_data: eventProperties,
    });
    if (insErr) console.error('  audit insert err:', insErr.message);
  }
  return { ok: res.ok };
}

// Mirror growth-quadrant.ts for archetype computation
async function getArchetypeForEmail(email) {
  const { data: u } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (!u?.id) return { archetype: 'Incomplete', executionScore: 0, positioningScore: 0 };
  const uid = u.id;
  const [cl, db, vl, a] = await Promise.all([
    supabase.from('call_lab_reports').select('full_report').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('discovery_briefs').select('version, markdown_response').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
    supabase.from('visibility_lab_reports').select('visibility_score, vvv_clarity_score').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('assessments').select('overall_score').eq('user_id', uid).eq('status', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const fr = cl.data?.full_report;
  const callLabScore = fr?.meta?.overallScore ?? fr?.meta?.overall_score ?? null;
  const briefs = db.data || [];
  let discoScore = null;
  if (briefs.length) {
    let sc = 30 + Math.min(briefs.length, 5) * 4;
    if (briefs.some(b => b.version === 'pro')) sc += 25;
    sc += 13; // completeness bonus approximation; full_report not selected here
    discoScore = Math.min(sc, 100);
  }
  let visScore = null;
  if (vl.data) {
    const v = vl.data.visibility_score, c = vl.data.vvv_clarity_score;
    if (v != null && c != null) visScore = Math.round(v * 0.7 + c * 10 * 0.3);
    else if (v != null) visScore = v;
  }
  const assessScore = a.data?.overall_score != null ? Math.round(a.data.overall_score * 20) : null;
  const exec = callLabScore == null && discoScore == null ? null
    : callLabScore != null && discoScore == null ? callLabScore
    : discoScore != null && callLabScore == null ? discoScore
    : Math.round(callLabScore * 0.6 + discoScore * 0.4);
  const pos = visScore == null && assessScore == null ? null
    : visScore != null && assessScore == null ? visScore
    : assessScore != null && visScore == null ? assessScore
    : Math.round(visScore * 0.6 + assessScore * 0.4);
  const e = exec ?? 0, p = pos ?? 0;
  const archetype = (exec == null && pos == null) ? 'Incomplete'
    : (e >= 50 && p >= 50) ? 'The Machine'
    : (e >= 50 && p < 50) ? 'The Hidden Gem'
    : (e < 50 && p >= 50) ? 'The Megaphone'
    : 'The Sleeper';
  return { archetype, executionScore: exec ?? 0, positioningScore: pos ?? 0 };
}

async function backfillDiscovery() {
  console.log('\n=== DISCOVERY BRIEFS ===');
  const { data: briefs } = await supabase
    .from('discovery_briefs')
    .select('id, user_id, lead_email, lead_name, target_company, target_contact_name, target_contact_title, version, created_at')
    .gte('created_at', '2026-04-01T22:01:00Z')
    .order('created_at', { ascending: true });

  const { data: fired } = await supabase
    .from('loops_events')
    .select('event_name, user_email, event_data')
    .in('event_name', ['discovery_report_generated_lite', 'discovery_report_generated_pro']);
  const firedKey = new Set((fired || []).map(f => `${f.user_email}|${f.event_data?.reportId || ''}`));

  for (const b of briefs || []) {
    const email = b.lead_email;
    if (!email) { console.log(`  skip (no email): ${b.id}`); continue; }
    if (SKIP_EMAILS.has(email.toLowerCase())) { console.log(`  skip test email: ${email} ${b.id}`); continue; }

    const key = `${email}|${b.id}`;
    if (firedKey.has(key)) { console.log(`  already fired: ${email} ${b.id}`); continue; }

    const arch = await getArchetypeForEmail(email);
    const reportTypeLabel = b.version === 'pro' ? 'SalesOS Discovery Lab Pro' : 'SalesOS Discovery Lab';
    const eventName = b.version === 'pro' ? 'discovery_report_generated_pro' : 'discovery_report_generated_lite';
    await sendEvent({
      email,
      eventName,
      eventProperties: {
        reportType: reportTypeLabel,
        targetCompany: b.target_company || '',
        targetContact: b.target_contact_name || '',
        targetContactTitle: b.target_contact_title || '',
        reportId: b.id,
        reportUrl: `${APP_URL}/discovery-lab/report/${b.id}`,
        archetype: arch.archetype,
        executionScore: arch.executionScore,
        positioningScore: arch.positioningScore,
        __backfillFrom: b.created_at,
      },
    });
  }
}

async function backfillCallLab() {
  console.log('\n=== CALL LAB REPORTS ===');
  const { data: scores } = await supabase
    .from('call_scores')
    .select('id, user_id, overall_score, version, created_at, ingestion_items(transcript_metadata)')
    .gte('created_at', '2026-04-01T22:01:00Z')
    .order('created_at', { ascending: true });

  const { data: fired } = await supabase
    .from('loops_events')
    .select('event_name, user_email, event_data')
    .in('event_name', ['report_generated_lite', 'report_generated_pro']);
  const firedKey = new Set((fired || []).map(f => `${f.user_email}|${f.event_data?.reportId || ''}`));

  for (const s of scores || []) {
    if (!s.user_id) { console.log(`  skip (no user_id): ${s.id}`); continue; }
    const { data: u } = await supabase.from('users').select('email, first_name, last_name').eq('id', s.user_id).maybeSingle();
    const email = u?.email;
    if (!email) { console.log(`  skip (no user email): ${s.id}`); continue; }
    if (SKIP_EMAILS.has(email.toLowerCase())) { console.log(`  skip test email: ${email} ${s.id}`); continue; }

    const key = `${email}|${s.id}`;
    if (firedKey.has(key)) { console.log(`  already fired: ${email} ${s.id}`); continue; }

    const reportType = s.version === 'pro' ? 'pro' : 'lite';
    const meta = s.ingestion_items?.transcript_metadata;
    const participants = meta?.participants || [];
    const prospect = participants.length > 1 ? participants[1] : null;
    const prospectName = prospect?.displayName || prospect?.name || '';
    const companyName = prospect?.email ? prospect.email.split('@')[1]?.split('.')[0] || '' : '';
    const arch = await getArchetypeForEmail(email);

    await sendEvent({
      email,
      userId: s.user_id,
      eventName: reportType === 'pro' ? 'report_generated_pro' : 'report_generated_lite',
      eventProperties: {
        reportId: s.id,
        reportUrl: `${APP_URL}/call-lab/report/${s.id}`,
        reportType,
        prospectName,
        companyName,
        archetype: arch.archetype,
        executionScore: arch.executionScore,
        positioningScore: arch.positioningScore,
        __backfillFrom: s.created_at,
      },
    });
  }
}

async function backfillAssessments() {
  console.log('\n=== ASSESSMENTS ===');
  const { data: ass } = await supabase
    .from('assessments')
    .select('id, user_id, status, overall_score, intake_data, completed_at, created_at')
    .gte('created_at', '2026-04-01T22:01:00Z')
    .eq('status', 'completed')
    .order('completed_at', { ascending: true });

  const { data: fired } = await supabase
    .from('loops_events')
    .select('event_name, user_email, event_data')
    .eq('event_name', 'assessment_completed');
  const firedKey = new Set((fired || []).map(f => `${f.user_email}|${f.event_data?.assessmentId || ''}`));

  for (const a of ass || []) {
    const email = a.intake_data?.email;
    if (!email) { console.log(`  skip (no email): ${a.id}`); continue; }
    if (SKIP_EMAILS.has(email.toLowerCase())) { console.log(`  skip test email: ${email} ${a.id}`); continue; }
    const key = `${email}|${a.id}`;
    if (firedKey.has(key)) { console.log(`  already fired: ${email} ${a.id}`); continue; }

    const arch = await getArchetypeForEmail(email);
    const nameParts = (a.intake_data.founderName || '').split(' ');
    await sendEvent({
      email,
      userId: a.user_id,
      eventName: 'assessment_completed',
      eventProperties: {
        firstName: nameParts[0] || '',
        agencyName: a.intake_data.agencyName || '',
        assessmentId: a.id,
        overallScore: a.overall_score,
        resultsUrl: `${APP_URL}/growthos/results/${a.id}`,
        archetype: arch.archetype,
        executionScore: arch.executionScore,
        positioningScore: arch.positioningScore,
        __backfillFrom: a.completed_at,
      },
    });
  }
}

async function backfillCoaching() {
  console.log('\n=== COACHING REPORTS ===');
  const { data: reports } = await supabase
    .from('coaching_reports')
    .select('id, user_id, report_type, period_start, period_end, scores_aggregate, created_at')
    .gte('created_at', '2026-04-01T22:01:00Z')
    .order('created_at', { ascending: true });

  const { data: fired } = await supabase
    .from('loops_events')
    .select('event_name, user_email, event_data')
    .in('event_name', ['coaching_weekly_ready', 'coaching_monthly_ready', 'coaching_quarterly_ready']);
  const firedKey = new Set((fired || []).map(f => `${f.user_email}|${f.event_data?.reportId || ''}`));

  for (const r of reports || []) {
    const { data: u } = await supabase.from('users').select('email, first_name').eq('id', r.user_id).maybeSingle();
    const email = u?.email;
    if (!email) { console.log(`  skip (no email): ${r.id}`); continue; }
    if (SKIP_EMAILS.has(email.toLowerCase())) { console.log(`  skip test email: ${email} ${r.id}`); continue; }
    const key = `${email}|${r.id}`;
    if (firedKey.has(key)) { console.log(`  already fired: ${email} ${r.id}`); continue; }

    const eventName = r.report_type === 'weekly' ? 'coaching_weekly_ready'
      : r.report_type === 'monthly' ? 'coaching_monthly_ready'
      : 'coaching_quarterly_ready';
    await sendEvent({
      email,
      userId: r.user_id,
      eventName,
      eventProperties: {
        reportId: r.id,
        reportUrl: `${APP_URL}/dashboard/coaching/${r.id}`,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        firstName: u.first_name || '',
        oneThingBehavior: '',
        oneThingDrill: '',
        __backfillFrom: r.created_at,
      },
    });
  }
}

(async () => {
  console.log(`DRY run: ${DRY ? 'YES' : 'NO — will actually fire events'}\n`);
  await backfillDiscovery();
  await backfillCallLab();
  await backfillAssessments();
  await backfillCoaching();
  console.log('\nDone.');
})();
