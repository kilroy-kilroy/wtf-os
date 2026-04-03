-- Add version column to visibility_lab_reports to distinguish pro from lite
ALTER TABLE visibility_lab_reports ADD COLUMN IF NOT EXISTS version text DEFAULT 'lite';

-- Backfill: mark reports from pro users as pro
UPDATE visibility_lab_reports vlr
SET version = 'pro'
FROM users u
WHERE vlr.user_id = u.id AND u.visibility_lab_tier = 'pro';
