-- Custom 24h-expiry single-use access tokens for the biz-dev report.
-- Decouples our auth flow from Supabase's OTP expiry (which is capped at 1h).
-- The email link includes ?access_token=XXX; report page exchanges it for a
-- Supabase session via admin API.

alter table biz_dev_assessments
  add column if not exists access_token text unique,
  add column if not exists access_token_expires_at timestamptz,
  add column if not exists access_token_used_at timestamptz;

create index if not exists biz_dev_assessments_access_token_idx
  on biz_dev_assessments (access_token)
  where access_token is not null;
