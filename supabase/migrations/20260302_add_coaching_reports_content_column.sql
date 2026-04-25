-- Add missing content column to coaching_reports
-- The schema file defined this column but it was never migrated to production.
-- Used by the coaching-emails cron job to extract the_one_thing for email content.
ALTER TABLE coaching_reports
ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
