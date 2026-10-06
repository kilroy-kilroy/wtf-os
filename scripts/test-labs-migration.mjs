// Isolated SQL regression test. Pass the installed PGlite module path as argv[2].
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 CREATE TABLE users(id uuid primary key,email text,call_lab_tier text DEFAULT 'free', discovery_lab_tier text, visibility_lab_tier text, subscription_tier text DEFAULT 'lead',is_admin boolean DEFAULT false,first_name text);
 CREATE TABLE agencies(id uuid); CREATE TABLE user_agency_assignments(id uuid); CREATE TABLE subscriptions(id uuid);
 CREATE TABLE instant_reports(id text); CREATE TABLE instant_leads(id text);
 CREATE TABLE call_snippets(id uuid,call_score_id uuid); CREATE TABLE follow_up_templates(id uuid,call_score_id uuid);
 GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
`);
for (const table of ['ingestion_items','call_scores','call_lab_reports','discovery_briefs','coaching_reports','tool_runs']) {
 await db.exec(`CREATE TABLE ${table}(id uuid,user_id uuid,outcome text,outcome_updated_at timestamptz,discovery_brief_id uuid);
 ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
 CREATE POLICY old_public_access ON ${table} FOR ALL USING(true) WITH CHECK(true);
 GRANT ALL ON ${table} TO anon,authenticated,service_role;`);
}
await db.exec(await readFile(new URL('../supabase/migrations/20261006_labs_access.sql',import.meta.url),'utf8'));
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
await db.exec(`INSERT INTO call_scores(id,user_id) VALUES('${owner}','${owner}'); INSERT INTO call_lab_reports(id,user_id) VALUES('${owner}','${owner}'); INSERT INTO users(id,email) VALUES('${owner}','owner@example.com'); INSERT INTO call_snippets VALUES('${owner}','${owner}');`);
async function as(role, user, sql) {
 await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
 try { return await db.query(sql); } finally { await db.exec('RESET ROLE'); }
}
await assert.rejects(as('anon','', 'SELECT * FROM call_scores'));
assert.equal((await as('authenticated',other,'SELECT * FROM call_scores')).rows.length,0);
assert.equal((await as('authenticated',owner,'SELECT * FROM call_scores')).rows.length,1);
assert.equal((await as('authenticated',other,'SELECT * FROM call_snippets')).rows.length,0);
assert.equal((await as('authenticated',owner,'SELECT * FROM call_snippets')).rows.length,1);
await assert.rejects(as('authenticated',owner,`UPDATE call_lab_reports SET user_id='${other}'`));
await as('authenticated',owner,`UPDATE call_lab_reports SET outcome='next_step'`);
await assert.rejects(as('authenticated',owner,`UPDATE users SET call_lab_tier='pro' WHERE id='${owner}'`));
await assert.rejects(as('authenticated',owner,`INSERT INTO users(id,is_admin) VALUES('${other}',true)`));
await as('authenticated',owner,`UPDATE users SET first_name='Test' WHERE id='${owner}'`);
await assert.rejects(as('authenticated',owner,'SELECT * FROM instant_reports'));
await assert.rejects(as('authenticated',owner,"SELECT consume_lab_quota('key',2)"));
assert.equal((await as('service_role','',"SELECT consume_lab_quota('key',2) AS allowed")).rows[0].allowed,true);
assert.equal((await as('service_role','',"SELECT consume_lab_quota('key',2) AS allowed")).rows[0].allowed,true);
assert.equal((await as('service_role','',"SELECT consume_lab_quota('key',2) AS allowed")).rows[0].allowed,false);
await db.exec(`ALTER TABLE call_scores ADD COLUMN overall_score numeric, ADD COLUMN markdown_response text;
 UPDATE call_scores SET overall_score=5,markdown_response='**Score:** 0/10' WHERE id='${owner}';
 INSERT INTO call_scores(id,overall_score,markdown_response) VALUES('${other}',5,'Score: 12/10');`);
const repair=await readFile(new URL('../supabase/migrations/20261006_labs_score_repair.sql',import.meta.url),'utf8');
await db.exec(repair);
await db.exec(repair);
assert.equal((await db.query(`SELECT overall_score FROM call_scores WHERE id='${owner}'`)).rows[0].overall_score,'0');
assert.equal((await db.query(`SELECT overall_score FROM call_scores WHERE id='${other}'`)).rows[0].overall_score,'5');
assert.equal((await db.query('SELECT count(*) FROM lab_score_repairs')).rows[0].count,1);
console.log('Migration passed: owner/guest boundaries, child reads, privilege escalation, safe outcome writes and quota limits.');
await db.close();
