-- 20260626_client_documents_prospect_share.sql
-- Prospect (no-enrollment) document sharing via public share_token.

ALTER TABLE client_documents ALTER COLUMN enrollment_id DROP NOT NULL;

ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS prospect_email TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS prospect_name TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_email TEXT;

DROP INDEX IF EXISTS client_documents_share_token_unique;
CREATE UNIQUE INDEX client_documents_share_token_unique
  ON client_documents(share_token) WHERE share_token IS NOT NULL;
