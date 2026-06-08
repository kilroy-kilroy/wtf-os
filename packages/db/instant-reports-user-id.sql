-- Make Call Lab Instant reports claimable by a user (account back-link).
-- Applied to project sthtvkcdahgsltwukirl via Supabase migration on 2026-06-07.
ALTER TABLE instant_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_instant_reports_user ON instant_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_instant_reports_email ON instant_reports(email);
